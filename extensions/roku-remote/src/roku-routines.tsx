import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { createDeeplink } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { verifiedClient } from "./lib/actions";
import { getRoutines, removeRoutine, saveRoutine } from "./lib/routine-store";
import { ROUTINE_KEYS, validateRoutine } from "./lib/routines";
import type { Routine, RoutineStep } from "./lib/routines";
import { describeRokuError } from "./lib/roku";
import { getSavedDevices } from "./lib/storage";
import type { RokuApp, RokuDevice } from "./lib/types";
import { ConnectionHelp } from "./components/ConnectionHelp";
import { KEY_LABELS, RoutineRunner, stepIcon, stepLabel } from "./components/routineRunner";

type Changed = () => Promise<void> | void;
type Template = "gaming" | "movie";

export default function RokuRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [devices, setDevices] = useState<RokuDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    setIsLoading(true);
    try {
      const [saved, tvs] = await Promise.all([getRoutines(), getSavedDevices()]);
      if (current !== generation.current) return;
      setRoutines(saved);
      setDevices(tvs);
      setError(undefined);
    } catch (cause) {
      if (current === generation.current) setError(describeRokuError(cause));
    } finally {
      if (current === generation.current) setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
    return () => {
      generation.current += 1;
    };
  }, [reload]);

  async function remove(routine: Routine) {
    if (
      !(await confirmAlert({
        title: `Remove “${routine.name}”?`,
        message: "This removes the saved routine. It doesn't control the TV.",
        primaryAction: { title: "Remove Routine", style: Alert.ActionStyle.Destructive },
      }))
    )
      return;
    try {
      await removeRoutine(routine.id);
      await reload();
      await showToast({ style: Toast.Style.Success, title: "Routine removed" });
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't remove routine",
        message: describeRokuError(cause),
      });
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Roku Routines" searchBarPlaceholder="Search routines…">
      <List.Section title="Create a Routine">
        <List.Item
          title="Build a Custom Routine"
          subtitle="Choose a TV and add your own steps"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Routine"
                icon={Icon.Plus}
                target={<RoutineEditor devices={devices} onChanged={reload} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Gaming"
          subtitle="Turn a TV on and switch to an input you choose"
          icon={Icon.GameController}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Gaming Routine"
                icon={Icon.GameController}
                target={<RoutineEditor devices={devices} template="gaming" onChanged={reload} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Movie Night"
          subtitle="Turn a TV on and open an app you choose"
          icon={Icon.FilmStrip}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Movie Night Routine"
                icon={Icon.FilmStrip}
                target={<RoutineEditor devices={devices} template="movie" onChanged={reload} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      {error ? (
        <List.Section title="Saved Routines">
          <List.Item
            title="Couldn't load routines"
            subtitle={error}
            icon={Icon.ExclamationMark}
            actions={
              <ActionPanel>
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={reload} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      {routines.length ? (
        <List.Section title="Saved Routines">
          {routines.map((routine) => {
            const device = devices.find((tv) => tv.id === routine.deviceId);
            return (
              <List.Item
                key={routine.id}
                title={routine.name}
                subtitle={device?.name ?? "TV is no longer saved"}
                icon={Icon.List}
                accessories={[{ text: `${routine.steps.length} steps` }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View and Edit Routine"
                      icon={Icon.Pencil}
                      target={<RoutineEditor initial={routine} devices={devices} onChanged={reload} />}
                    />
                    {device ? (
                      <Action.Push
                        title="Run Routine"
                        icon={Icon.Play}
                        target={<RoutineRunner routine={routine} deviceName={device.name} />}
                      />
                    ) : null}
                    <Action.CreateQuicklink
                      title="Create Quicklink"
                      quicklink={{
                        name: routine.name,
                        link: createDeeplink({ command: "run-roku-routine", arguments: { routineId: routine.id } }),
                      }}
                    />
                    <Action
                      title="Remove Routine"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => remove(routine)}
                    />
                    <Action
                      title="Refresh Routines"
                      icon={Icon.ArrowClockwise}
                      onAction={reload}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
}

export function RoutineEditor({
  initial,
  devices,
  template,
  onChanged,
}: {
  initial?: Routine;
  devices: RokuDevice[];
  template?: Template;
  onChanged?: Changed;
}) {
  const { push } = useNavigation();
  const [draft, setDraft] = useState<Routine>(
    () =>
      initial ?? {
        id: randomUUID(),
        name: template === "gaming" ? "Gaming" : template === "movie" ? "Movie Night" : "",
        deviceId: "",
        steps: template ? [{ type: "wake" }] : [],
      },
  );
  const [savedVersion, setSavedVersion] = useState(initial ? JSON.stringify(initial) : "");
  const [isSaving, setIsSaving] = useState(false);
  const [selection, setSelection] = useState<string>();
  const device = devices.find((tv) => tv.id === draft.deviceId);
  const dirty = JSON.stringify(draft) !== savedVersion;
  const needsTemplateTarget = template && !draft.steps.some((step) => step.type === "launch");

  async function details(values: { name: string; deviceId: string; description?: string }) {
    if (draft.deviceId && values.deviceId !== draft.deviceId && draft.steps.length) {
      if (
        !(await confirmAlert({
          title: "Change the routine's TV?",
          message: "Existing steps will be cleared so you can choose apps and controls for the new TV.",
          primaryAction: { title: "Change TV" },
        }))
      )
        return false;
      setDraft((current) => ({ ...current, ...values, steps: [] }));
    } else {
      setDraft((current) => ({ ...current, ...values }));
    }
    return true;
  }

  function add(step: RoutineStep) {
    setDraft((current) => ({ ...current, steps: [...current.steps, step] }));
  }
  function edit(index: number, step: RoutineStep) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((existing, position) => (position === index ? step : existing)),
    }));
  }
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.steps.length) return;
    setDraft((current) => {
      const steps = [...current.steps];
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...current, steps };
    });
    setSelection(`step-${target}`);
  }

  function checked(): Routine {
    if (needsTemplateTarget)
      throw new Error(
        template === "gaming" ? "Choose the TV input for Gaming first." : "Choose the app for Movie Night first.",
      );
    if (!device) throw new Error("Choose a TV that is saved in the extension.");
    return validateRoutine(draft);
  }

  async function save() {
    setIsSaving(true);
    try {
      const normalized = checked();
      await saveRoutine(normalized);
      setDraft(normalized);
      setSavedVersion(JSON.stringify(normalized));
      await onChanged?.();
      await showToast({ style: Toast.Style.Success, title: "Routine saved", message: normalized.name });
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't save routine",
        message: describeRokuError(cause),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function run() {
    try {
      push(<RoutineRunner routine={checked()} deviceName={device?.name} />);
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Routine needs a change",
        message: describeRokuError(cause),
      });
    }
  }

  if (!draft.deviceId || !draft.name)
    return <RoutineDetailsForm devices={devices} initial={draft} onSave={details} stayOpen />;
  const tools = (
    <ActionPanel.Section title="Routine">
      {device && draft.steps.length < 20 ? (
        <Action.Push
          title="Add Step"
          icon={Icon.Plus}
          target={<RoutineStepForm device={device} onSave={add} />}
          shortcut={Keyboard.Shortcut.Common.New}
        />
      ) : null}
      <Action title="Save Routine" icon={Icon.Checkmark} onAction={save} shortcut={Keyboard.Shortcut.Common.Save} />
      <Action title="Run Routine" icon={Icon.Play} onAction={run} />
      <Action.Push
        title="Edit Name and TV"
        icon={Icon.Pencil}
        target={<RoutineDetailsForm devices={devices} initial={draft} onSave={details} />}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isSaving}
      isShowingDetail
      selectedItemId={selection}
      onSelectionChange={(id) => setSelection(id ?? undefined)}
      navigationTitle={draft.name}
      searchBarPlaceholder="Search routine steps…"
    >
      <List.Section
        title={draft.name}
        subtitle={`${device?.name ?? "Choose a saved TV"} · ${dirty ? "Unsaved changes" : "Saved"}`}
      >
        <List.Item
          id="overview"
          title="Routine Details"
          subtitle={device?.name ?? "TV is no longer saved"}
          icon={Icon.List}
          detail={
            <List.Item.Detail
              markdown={
                draft.description ??
                "Steps run in order on this TV. A failed step stops later steps. Running opens a progress view where you can cancel."
              }
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="TV" text={device?.name ?? "Missing"} />
                  <List.Item.Detail.Metadata.Label title="Steps" text={`${draft.steps.length} of 20`} />
                  <List.Item.Detail.Metadata.Label title="Changes" text={dirty ? "Not saved" : "Saved"} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={<ActionPanel>{tools}</ActionPanel>}
        />
        {needsTemplateTarget && device ? (
          <List.Item
            id="template-target"
            title={template === "gaming" ? "Choose Gaming Input" : "Choose Movie Night App"}
            subtitle="Pick from this TV's actual inputs or apps"
            icon={template === "gaming" ? Icon.GameController : Icon.FilmStrip}
            actions={
              <ActionPanel>
                <Action.Push
                  title={template === "gaming" ? "Choose TV Input" : "Choose App"}
                  icon={Icon.Plus}
                  target={
                    <RoutineStepForm
                      device={device}
                      initialType="launch"
                      launchMode={template === "gaming" ? "input" : "app"}
                      onSave={add}
                    />
                  }
                />
                {tools}
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>
      <List.Section title="Steps" subtitle="Run from top to bottom">
        {draft.steps.map((step, index) => (
          <List.Item
            key={index}
            id={`step-${index}`}
            title={`${index + 1}. ${stepLabel(step)}`}
            icon={stepIcon(step)}
            detail={<List.Item.Detail markdown={`${stepLabel(step)}\n\nRuns on ${device?.name ?? "the saved TV"}.`} />}
            actions={
              <ActionPanel>
                {device ? (
                  <Action.Push
                    title="Edit Step"
                    icon={Icon.Pencil}
                    target={
                      <RoutineStepForm
                        device={device}
                        initial={step}
                        onSave={(replacement) => edit(index, replacement)}
                      />
                    }
                  />
                ) : null}
                {index > 0 ? (
                  <Action
                    title="Move Step up"
                    icon={Icon.ArrowUp}
                    onAction={() => move(index, -1)}
                    shortcut={Keyboard.Shortcut.Common.MoveUp}
                  />
                ) : null}
                {index < draft.steps.length - 1 ? (
                  <Action
                    title="Move Step Down"
                    icon={Icon.ArrowDown}
                    onAction={() => move(index, 1)}
                    shortcut={Keyboard.Shortcut.Common.MoveDown}
                  />
                ) : null}
                <Action
                  title="Remove Step"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() =>
                    setDraft((current) => ({
                      ...current,
                      steps: current.steps.filter((_, position) => position !== index),
                    }))
                  }
                />
                {tools}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {device && draft.steps.length < 20 ? (
        <List.Section title="Add to This Routine">
          <List.Item
            id="add-step"
            title="Add Step"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Step"
                  icon={Icon.Plus}
                  target={<RoutineStepForm device={device} onSave={add} />}
                />
                {tools}
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}

function RoutineDetailsForm({
  devices,
  initial,
  onSave,
  stayOpen = false,
}: {
  devices: RokuDevice[];
  initial: Routine;
  onSave: (values: { name: string; deviceId: string; description?: string }) => Promise<boolean>;
  stayOpen?: boolean;
}) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string>();
  const [deviceError, setDeviceError] = useState<string>();
  const [descriptionError, setDescriptionError] = useState<string>();
  async function submit(values: { name: string; deviceId: string; description: string }) {
    const name = values.name.trim();
    const description = values.description.trim();
    let invalid = false;
    if (!name || name.length > 80) {
      setNameError("Use a name from 1 to 80 characters.");
      invalid = true;
    }
    if (!devices.some((device) => device.id === values.deviceId)) {
      setDeviceError("Choose a saved TV.");
      invalid = true;
    }
    if (description.length > 300) {
      setDescriptionError("Keep the description under 300 characters.");
      invalid = true;
    }
    if (invalid) return;
    const applied = await onSave({ name, deviceId: values.deviceId, description: description || undefined });
    if (applied && !stayOpen) pop();
  }
  return (
    <Form
      navigationTitle="Routine Details"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={stayOpen ? "Choose Steps" : "Apply Changes"}
            icon={Icon.Checkmark}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Routine Name"
        defaultValue={initial.name}
        placeholder="My routine"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.Dropdown
        id="deviceId"
        title="TV"
        defaultValue={initial.deviceId}
        error={deviceError}
        onChange={() => setDeviceError(undefined)}
      >
        <Form.Dropdown.Item value="" title="Choose a TV" />
        {devices.map((device) => (
          <Form.Dropdown.Item key={device.id} value={device.id} title={device.name} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={initial.description ?? ""}
        placeholder="Optional description"
        error={descriptionError}
        onChange={() => setDescriptionError(undefined)}
      />
      {!devices.length ? (
        <Form.Description text="Add a TV in Manage Roku TVs, then return here to create a routine." />
      ) : null}
    </Form>
  );
}

function RoutineStepForm({
  device,
  initial,
  initialType,
  launchMode,
  onSave,
}: {
  device: RokuDevice;
  initial?: RoutineStep;
  initialType?: RoutineStep["type"];
  launchMode?: "input" | "app";
  onSave: (step: RoutineStep) => void;
}) {
  const { pop } = useNavigation();
  const [type, setType] = useState<RoutineStep["type"]>(initial?.type ?? initialType ?? "key");
  const [apps, setApps] = useState<RokuApp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();
  const [selectedAppId, setSelectedAppId] = useState(initial?.type === "launch" ? initial.appId : "");
  const generation = useRef(0);
  const loadApps = useCallback(async () => {
    const current = ++generation.current;
    setIsLoading(true);
    setLoadError(undefined);
    setApps([]);
    try {
      const client = await verifiedClient(device);
      const found = await client.getApps();
      if (current === generation.current)
        setApps(
          found.filter((app) =>
            launchMode === "input"
              ? app.id.startsWith("tvinput.")
              : launchMode === "app"
                ? !app.id.startsWith("tvinput.")
                : true,
          ),
        );
    } catch (cause) {
      if (current === generation.current) setLoadError(describeRokuError(cause));
    } finally {
      if (current === generation.current) setIsLoading(false);
    }
  }, [device.id, device.host, launchMode]);
  useEffect(() => {
    if (type === "launch") void loadApps();
    return () => {
      generation.current += 1;
    };
  }, [type, loadApps]);

  const keys = ROUTINE_KEYS.filter(
    (key) =>
      !key.startsWith("Input") &&
      (!key.startsWith("Volume") || device.capabilities.volume) &&
      (key !== "PowerOff" || device.capabilities.power) &&
      (key !== "FindRemote" || device.capabilities.findRemote),
  );
  async function submit(values: { key: string; count: string; seconds: string; appId: string }) {
    let step: RoutineStep;
    if (type === "launch") {
      const app = apps.find((item) => item.id === values.appId);
      if (!app) {
        setFieldError("Choose an app or input returned by this TV.");
        return;
      }
      step = { type: "launch", appId: app.id, appName: app.name };
    } else if (type === "key") {
      if (!keys.includes(values.key as (typeof keys)[number])) {
        setFieldError("Choose a supported control.");
        return;
      }
      step = { type: "key", key: values.key, count: Number(values.count) };
    } else if (type === "wait") {
      step = { type: "wait", seconds: Number(values.seconds) };
    } else {
      step = { type };
    }
    try {
      validateRoutine({ id: "draft", name: "Draft", deviceId: device.id, steps: [step] });
    } catch (cause) {
      setFieldError(describeRokuError(cause));
      return;
    }
    onSave(step);
    pop();
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={initial ? "Edit Routine Step" : "Add Routine Step"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={initial ? "Apply Step" : "Add Step"} icon={Icon.Checkmark} onSubmit={submit} />
          {type === "launch" ? (
            <Action
              title="Refresh Apps and Inputs"
              icon={Icon.ArrowClockwise}
              onAction={loadApps}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          ) : null}
          <Action.Push
            title="Connection Help"
            icon={Icon.Info}
            target={<ConnectionHelp device={device} message={loadError} />}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="TV" text={device.name} />
      <Form.Dropdown
        id="type"
        title="Action"
        value={type}
        onChange={(value) => {
          setType(value as RoutineStep["type"]);
          setFieldError(undefined);
        }}
      >
        <Form.Dropdown.Item value="wake" title="Turn TV On" icon={Icon.Power} />
        <Form.Dropdown.Item value="launch" title="Open App or TV Input" icon={Icon.AppWindow} />
        <Form.Dropdown.Item value="key" title="Press Remote Control" icon={Icon.Keyboard} />
        <Form.Dropdown.Item value="wait" title="Wait" icon={Icon.Clock} />
        <Form.Dropdown.Item value="restore" title="Restore Previous App or Input" icon={Icon.ArrowCounterClockwise} />
      </Form.Dropdown>
      {type === "launch" ? (
        <>
          <Form.Dropdown
            id="appId"
            title={launchMode === "input" ? "TV Input" : launchMode === "app" ? "App" : "App or Input"}
            value={selectedAppId}
            error={fieldError}
            onChange={(value) => {
              setSelectedAppId(value);
              setFieldError(undefined);
            }}
          >
            <Form.Dropdown.Item value="" title={isLoading ? "Loading…" : "Choose an app or input"} />
            {apps.map((app) => (
              <Form.Dropdown.Item
                key={app.id}
                value={app.id}
                title={app.name}
                icon={app.id.startsWith("tvinput.") ? Icon.Desktop : Icon.AppWindow}
              />
            ))}
          </Form.Dropdown>
          {loadError ? (
            <Form.Description text={loadError} />
          ) : !isLoading && !apps.length ? (
            <Form.Description text="No matching apps or inputs were returned. Refresh the list or check network control on the TV." />
          ) : null}
        </>
      ) : null}
      {type === "key" ? (
        <>
          <Form.Dropdown
            id="key"
            title="Control"
            defaultValue={initial?.type === "key" ? initial.key : keys[0]}
            error={fieldError}
            onChange={() => setFieldError(undefined)}
          >
            {keys.map((key) => (
              <Form.Dropdown.Item key={key} value={key} title={KEY_LABELS[key] ?? key} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="count"
            title="Presses"
            defaultValue={String(initial?.type === "key" ? (initial.count ?? 1) : 1)}
          >
            {Array.from({ length: 20 }, (_, i) => (
              <Form.Dropdown.Item key={i + 1} value={String(i + 1)} title={String(i + 1)} />
            ))}
          </Form.Dropdown>
        </>
      ) : null}
      {type === "wait" ? (
        <Form.Dropdown
          id="seconds"
          title="Seconds"
          defaultValue={String(initial?.type === "wait" ? initial.seconds : 1)}
          error={fieldError}
        >
          {Array.from({ length: 31 }, (_, i) => (
            <Form.Dropdown.Item key={i} value={String(i)} title={String(i)} />
          ))}
        </Form.Dropdown>
      ) : null}
      {type === "wake" ? (
        <Form.Description text="Turn the TV on and wait for it to be reachable before continuing." />
      ) : null}
      {type === "restore" ? (
        <Form.Description text="Return to the previous app or input recorded by this extension." />
      ) : null}
    </Form>
  );
}
