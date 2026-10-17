import { useState, useEffect } from "react";
import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { CustomPreset, FanSpec, MfcError, upsertPreset } from "../lib/mfc";
import { readSmc, Fan, fanLabel, formatRpm } from "../lib/smc";
import { ensureInstalled } from "../lib/actions";

type Props = {
  /** Text on the submit button, e.g. "Create Preset". */
  submitTitle: string;
  initialName?: string;
  /** Hide the name field — used by Set Fan Speed, which owns its preset name. */
  lockName?: boolean;
  initialFans?: FanSpec[];
  activateAfterSave?: boolean;
  /** Mode used for fans with no stored value. Defaults to a constant speed. */
  defaultMode?: FanMode;
  onSaved?: (preset: CustomPreset) => void;
};

type FanMode = "auto" | "constant";
type FanFormState = {
  mode: FanMode;
  rpm: string;
  /**
   * A sensor-based rule built in Macs Fan Control. We don't model those, so the
   * fan is shown read-only and its original value is written back untouched.
   */
  locked?: FanSpec;
};

function currentRpm(fan: Fan): string {
  return String(Math.round(fan.target ?? fan.actual ?? fan.min ?? 0));
}

function stateForFan(fan: Fan, spec: FanSpec | undefined, fallback: FanMode): FanFormState {
  if (spec?.kind === "constant") return { mode: "constant", rpm: String(spec.rpm) };
  if (spec?.kind === "auto") return { mode: "auto", rpm: currentRpm(fan) };
  if (spec?.kind === "raw") return { mode: "auto", rpm: currentRpm(fan), locked: spec };
  return { mode: fallback, rpm: currentRpm(fan) };
}

function sameSettings(a: FanFormState, b: FanFormState): boolean {
  if (a.locked || b.locked) return false;
  if (a.mode !== b.mode) return false;
  return a.mode === "auto" || a.rpm === b.rpm;
}

/** The speed range every fan can satisfy, for the linked "all fans" control. */
function sharedRange(fans: Fan[]): { min: number | null; max: number | null } {
  const mins = fans.map((f) => f.min).filter((v): v is number => v !== null);
  const maxes = fans.map((f) => f.max).filter((v): v is number => v !== null);
  return {
    min: mins.length ? Math.max(...mins) : null,
    max: maxes.length ? Math.min(...maxes) : null,
  };
}

function rangeLabel(min: number | null, max: number | null): string {
  if (min === null || max === null) return "rpm";
  return `${Math.round(min)}–${Math.round(max)} rpm`;
}

export default function PresetEditor(props: Props) {
  const { pop } = useNavigation();
  const [name, setName] = useState(props.initialName ?? "");
  const [nameError, setNameError] = useState<string | undefined>();
  const [perFan, setPerFan] = useState(false);
  const [shared, setShared] = useState<FanFormState>({ mode: "constant", rpm: "" });
  const [sharedError, setSharedError] = useState<string | undefined>();
  const [fanState, setFanState] = useState<FanFormState[]>([]);
  const [rpmErrors, setRpmErrors] = useState<(string | undefined)[]>([]);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  const { data: smc, isLoading, error: smcError } = usePromise(readSmc);
  const fans = smc?.fans ?? [];

  useEffect(() => {
    if (fans.length === 0 || ready) return;
    const fallback = props.defaultMode ?? "constant";
    const states = fans.map((f, i) => stateForFan(f, props.initialFans?.[i], fallback));

    // Open in per-fan mode only when this preset actually differs between fans
    // — so a preset built one way keeps looking that way when reopened.
    const differs = states.some((s) => !sameSettings(s, states[0]));
    setPerFan(fans.length > 1 && differs);

    // Seed the linked control from the fans, keeping every fan reachable.
    const { min, max } = sharedRange(fans);
    const seed = states[0];
    let rpm = seed.rpm;
    if (min !== null && Number(rpm) < min) rpm = String(Math.round(min));
    if (max !== null && Number(rpm) > max) rpm = String(Math.round(max));
    setShared({ mode: differs ? "constant" : seed.mode, rpm });

    setFanState(states);
    setReady(true);
  }, [fans.length, ready]);

  function updateFan(index: number, patch: Partial<FanFormState>) {
    setFanState((cur) => cur.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    setRpmErrors((cur) => cur.map((e, i) => (i === index ? undefined : e)));
  }

  function validateRpm(raw: string, min: number | null, max: number | null): string | undefined {
    if (!/^\d+$/.test(raw.trim())) return "Enter a whole number";
    const rpm = Number(raw);
    if (min !== null && rpm < min) return `Minimum is ${Math.round(min)} rpm`;
    if (max !== null && rpm > max) return `Maximum is ${Math.round(max)} rpm`;
    return undefined;
  }

  function validate(): FanSpec[] | null {
    let ok = true;

    if (!props.lockName) {
      const trimmed = name.trim();
      if (!trimmed) {
        setNameError("Give the preset a name");
        ok = false;
      } else if (trimmed.includes("|")) {
        setNameError("Names cannot contain “|”");
        ok = false;
      }
    }

    const specs: FanSpec[] = [];

    if (!perFan) {
      const { min, max } = sharedRange(fans);
      let err: string | undefined;
      if (shared.mode === "constant") {
        err = validateRpm(shared.rpm, min, max);
        if (err) ok = false;
      }
      setSharedError(err);
      for (const state of fanState) {
        // A sensor-based fan is never rewritten, even in linked mode.
        if (state.locked) specs.push(state.locked);
        else if (shared.mode === "auto") specs.push({ kind: "auto" });
        else specs.push({ kind: "constant", rpm: Number(shared.rpm) });
      }
    } else {
      const errors: (string | undefined)[] = fans.map(() => undefined);
      fanState.forEach((state, i) => {
        const fan = fans[i];
        if (!fan) return;
        if (state.locked) return specs.push(state.locked);
        if (state.mode === "auto") return specs.push({ kind: "auto" });
        const err = validateRpm(state.rpm, fan.min, fan.max);
        if (err) {
          errors[i] = err;
          ok = false;
        }
        specs.push({ kind: "constant", rpm: Number(state.rpm) });
      });
      setRpmErrors(errors);
    }

    if (!ok) return null;

    if (specs.length === 0 || specs.every((s) => s.kind === "auto")) {
      showToast({
        style: Toast.Style.Failure,
        title: "Nothing to save",
        message: "Set at least one fan to a constant speed.",
      });
      return null;
    }
    return specs;
  }

  async function handleSubmit() {
    const specs = validate();
    if (!specs) return;
    if (!(await ensureInstalled())) return;

    setSaving(true);
    const finalName = (props.lockName ? (props.initialName ?? "") : name).trim();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Saving “${finalName}”…`,
      message: "Restarting Macs Fan Control",
    });

    try {
      const saved = await upsertPreset(finalName, specs, { activate: props.activateAfterSave });
      toast.style = Toast.Style.Success;
      toast.title = props.activateAfterSave ? `Fans set to “${finalName}”` : `Saved “${finalName}”`;
      toast.message = undefined;
      props.onSaved?.(saved);
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not save preset";
      toast.message = error instanceof MfcError ? error.message : String(error);
    } finally {
      setSaving(false);
    }
  }

  // Raycast wants a flat list of form items, so build them up one at a time.
  const items: JSX.Element[] = [];
  const multiFan = fans.length > 1;
  const lockedCount = fanState.filter((s) => s.locked).length;

  if (multiFan) {
    items.push(
      <Form.Dropdown
        key="scope"
        id="scope"
        title="Apply To"
        value={perFan ? "each" : "all"}
        info="Saved with the preset, so reopening it shows the same layout."
        onChange={(v) => setPerFan(v === "each")}
      >
        <Form.Dropdown.Item value="all" title={`All ${fans.length} fans together`} icon={Icon.Gauge} />
        <Form.Dropdown.Item value="each" title="Each fan separately" icon={Icon.BulletPoints} />
      </Form.Dropdown>,
    );
  }

  if (!perFan) {
    const { min, max } = sharedRange(fans);
    items.push(
      <Form.Dropdown
        key="shared-mode"
        id="shared-mode"
        title={multiFan ? "All Fans" : fans[0] ? fanLabel(fans[0], 1) : "Fan"}
        value={shared.mode}
        onChange={(v) => {
          setShared((s) => ({ ...s, mode: v as FanMode }));
          setSharedError(undefined);
        }}
      >
        <Form.Dropdown.Item value="auto" title="Automatic (system)" icon={Icon.Gauge} />
        <Form.Dropdown.Item value="constant" title="Constant RPM" icon={Icon.Bolt} />
      </Form.Dropdown>,
    );
    if (shared.mode === "constant") {
      items.push(
        <Form.TextField
          key="shared-rpm"
          id="shared-rpm"
          title="Speed"
          placeholder={rangeLabel(min, max)}
          info={`Allowed range: ${rangeLabel(min, max)}${multiFan ? " (every fan can reach this)" : ""}`}
          value={shared.rpm}
          error={sharedError}
          onChange={(v) => {
            setShared((s) => ({ ...s, rpm: v }));
            setSharedError(undefined);
          }}
        />,
      );
    }
  } else {
    fans.forEach((fan, i) => {
      const state = fanState[i];
      if (!state) return;
      const label = fanLabel(fan, fans.length);

      items.push(
        <Form.Description
          key={`head-${i}`}
          title={label}
          text={`Now ${formatRpm(fan.actual)} · range ${rangeLabel(fan.min, fan.max)}`}
        />,
      );

      if (state.locked) {
        items.push(
          <Form.Description
            key={`locked-${i}`}
            title=""
            text="Sensor-based rule from Macs Fan Control — left exactly as it is."
          />,
        );
        return;
      }

      items.push(
        <Form.Dropdown
          key={`mode-${i}`}
          id={`mode-${i}`}
          title="Control"
          value={state.mode}
          onChange={(v) => updateFan(i, { mode: v as FanMode })}
        >
          <Form.Dropdown.Item value="auto" title="Automatic (system)" icon={Icon.Gauge} />
          <Form.Dropdown.Item value="constant" title="Constant RPM" icon={Icon.Bolt} />
        </Form.Dropdown>,
      );

      if (state.mode === "constant") {
        items.push(
          <Form.TextField
            key={`rpm-${i}`}
            id={`rpm-${i}`}
            title="Speed"
            placeholder={rangeLabel(fan.min, fan.max)}
            info={`Allowed range: ${rangeLabel(fan.min, fan.max)}`}
            value={state.rpm}
            error={rpmErrors[i]}
            onChange={(v) => updateFan(i, { rpm: v })}
          />,
        );
      }
    });
  }

  // A failed SMC read is not the same as a Mac without fans — saying "fanless"
  // when the helper simply errored would be plainly wrong on a MacBook Pro.
  if (!isLoading && smcError) {
    return (
      <Form>
        <Form.Description
          title="Could not read the fans"
          text={`${smcError.message}\n\nThe bundled smc-reader helper could not be run, so this form cannot show fan speeds or their limits.`}
        />
      </Form>
    );
  }

  if (!isLoading && !smcError && fans.length === 0) {
    return (
      <Form>
        <Form.Description
          title="No controllable fans"
          text={
            "This Mac reports no fans to the SMC, so there is nothing to set. " +
            "Fanless models such as the MacBook Air are cooled passively."
          }
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading || saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={props.submitTitle} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {props.lockName ? (
        <Form.Description
          title="Preset"
          text={`Saved to “${props.initialName}”, which this command overwrites each time.`}
        />
      ) : (
        <Form.TextField
          id="name"
          title="Preset Name"
          placeholder="Quiet, Gaming, Render…"
          value={name}
          error={nameError}
          onChange={(v) => {
            setName(v);
            setNameError(undefined);
          }}
        />
      )}
      <Form.Separator />
      {items}
      {lockedCount > 0 && !perFan && (
        <Form.Description
          title="Note"
          text={`${lockedCount} sensor-based fan${lockedCount === 1 ? "" : "s"} in this preset will keep their existing rule.`}
        />
      )}
    </Form>
  );
}
