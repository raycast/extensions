import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import {
  addRemapEntry,
  updateRemap,
  RemapType,
  RemapItem,
  RawRemap,
  RawModifierRemap,
  RawConditionalRemap,
  RawTapHold,
  RawChord,
  TargetIdentity,
} from "./lib/config";
import { restartService } from "./lib/service";
import { parsePositiveInt, validateChordKeys } from "./lib/config-pure.mjs";
import { ALL_KEYS, MODIFIER_KEYS, MODIFIER_NAMES } from "./lib/keys";

const TYPE_OPTIONS: { value: RemapType; title: string }[] = [
  { value: "remap", title: "Key Swap" },
  { value: "modifier_remap", title: "Modifier Remap" },
  { value: "conditional_remap", title: "Conditional Remap" },
  { value: "tap_hold", title: "Tap-Hold" },
  { value: "chord", title: "Chord" },
];

interface RemapFormProps {
  onAdd?: () => void;
  editItem?: RemapItem;
  /** Document revision (SHA-256) captured at display time for stale detection */
  documentRevision?: string;
  /** Entry fingerprint captured at display time for stale detection */
  editFingerprint?: string;
  /** Target identity from snapshot for commit revalidation */
  targetIdentity?: TargetIdentity | null;
}

function getDefaultValues(editItem?: RemapItem) {
  if (!editItem) return {};
  const raw = editItem.raw;
  switch (editItem.type) {
    case "remap": {
      const r = raw as RawRemap;
      return { from: r.from, to: r.to };
    }
    case "modifier_remap": {
      const r = raw as RawModifierRemap;
      return { from: r.from, to: r.to };
    }
    case "conditional_remap": {
      const r = raw as RawConditionalRemap;
      return { modifier: r.modifier, from: r.from, to: r.to };
    }
    case "tap_hold": {
      const r = raw as RawTapHold;
      return {
        key: r.key,
        tap: r.tap,
        hold: r.hold,
        timeout_ms: String(r.timeout_ms ?? 200),
      };
    }
    case "chord": {
      const r = raw as RawChord;
      return {
        keys: r.keys,
        emit: r.emit,
        window_ms: String(r.window_ms ?? 100),
      };
    }
  }
}

export function AddRemapForm({
  onAdd,
  editItem,
  documentRevision,
  editFingerprint,
  targetIdentity,
}: RemapFormProps) {
  const { pop } = useNavigation();
  const isEditing = !!editItem;
  const defaults = getDefaultValues(editItem);
  const [remapType, setRemapType] = useState<RemapType>(
    editItem?.type ?? "conditional_remap",
  );

  // ── Controlled field state + inline errors (F5) ────────────────────
  const [timeoutValue, setTimeoutValue] = useState<string>(
    (defaults.timeout_ms as string) ?? "200",
  );
  const [windowValue, setWindowValue] = useState<string>(
    (defaults.window_ms as string) ?? "100",
  );
  const [keysValue, setKeysValue] = useState<string[]>(
    (defaults.keys as string[]) ?? [],
  );
  const [timeoutError, setTimeoutError] = useState<string | null>(null);
  const [windowError, setWindowError] = useState<string | null>(null);
  const [keysError, setKeysError] = useState<string | null>(null);

  async function handleSubmit(values: Record<string, string | string[]>) {
    // ── F5: validate BEFORE any config write ──────────────────────────
    let parsedTimeout = 200;
    let parsedWindow = 100;
    let parsedKeys: string[] = [];

    if (remapType === "tap_hold") {
      try {
        parsedTimeout = parsePositiveInt(timeoutValue, "Timeout");
        setTimeoutError(null);
      } catch (e) {
        setTimeoutError(
          e instanceof Error ? e.message : "Invalid timeout value",
        );
        return;
      }
    }

    if (remapType === "chord") {
      try {
        parsedWindow = parsePositiveInt(windowValue, "Window");
        setWindowError(null);
      } catch (e) {
        setWindowError(e instanceof Error ? e.message : "Invalid window value");
        return;
      }
      try {
        parsedKeys = validateChordKeys(
          keysValue.length > 0 ? keysValue : ((values.keys as string[]) ?? []),
        );
        setKeysError(null);
      } catch (e) {
        setKeysError(
          e instanceof Error ? e.message : "Invalid chord keys selection",
        );
        return;
      }
    }

    // ── F1: separate config write from restart ────────────────────────
    // All writes route through atomic I/O with revision/fingerprint.
    try {
      if (isEditing) {
        let data: Record<string, unknown>;
        switch (remapType) {
          case "remap":
            data = { from: values.from, to: values.to };
            break;
          case "modifier_remap":
            data = { from: values.from, to: values.to };
            break;
          case "conditional_remap":
            data = {
              modifier: values.modifier,
              from: values.from,
              to: values.to,
            };
            break;
          case "tap_hold":
            data = {
              key: values.key,
              tap: values.tap,
              hold: values.hold,
              timeout_ms: parsedTimeout,
            };
            break;
          case "chord":
            data = {
              keys: parsedKeys,
              emit: values.emit,
              window_ms: parsedWindow,
            };
            break;
          default:
            throw new Error(`Unknown remap type: ${remapType}`);
        }
        // Edit: pass captured revision + fingerprint + target for stale detection.
        updateRemap(
          editItem.id,
          data,
          documentRevision ?? "",
          editFingerprint ?? "",
          targetIdentity ?? null,
        );
      } else {
        // Add: reads fresh snapshot at action time inside addRemapEntry.
        // No stale-revision concern — adds don't modify existing entries.
        switch (remapType) {
          case "remap":
            addRemapEntry("remap", {
              from: values.from as string,
              to: values.to as string,
            });
            break;
          case "modifier_remap":
            addRemapEntry("modifier_remap", {
              from: values.from as string,
              to: values.to as string,
            });
            break;
          case "conditional_remap":
            addRemapEntry("conditional_remap", {
              modifier: values.modifier as string,
              from: values.from as string,
              to: values.to as string,
            });
            break;
          case "tap_hold":
            addRemapEntry("tap_hold", {
              key: values.key as string,
              tap: values.tap as string,
              hold: values.hold as string,
              timeout_ms: parsedTimeout,
            });
            break;
          case "chord":
            addRemapEntry("chord", {
              keys: parsedKeys,
              emit: values.emit as string,
              window_ms: parsedWindow,
            });
            break;
        }
      }
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: isEditing ? "Failed to update remap" : "Failed to add remap",
        message: e instanceof Error ? e.message : String(e),
      });
      return;
    }

    // Write succeeded — report success and navigate regardless of restart.
    onAdd?.();
    await showToast({
      style: Toast.Style.Success,
      title: isEditing ? "Remap updated" : "Remap added",
    });
    pop();

    // Second try/catch: restart only. Failure is non-fatal.
    // The result message is displayed but does not block navigation.
    try {
      const result = restartService();
      // Show "Restart requested" for graceful standalone, "Switcheroo
      // restarted" for Homebrew. The save toast already showed persistence.
      await showToast({
        style: Toast.Style.Success,
        title: result.message,
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Saved, but restart failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <Form
      navigationTitle={isEditing ? "Edit Remap" : "Add Remap"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Remap" : "Add Remap"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="type"
        title="Type"
        value={remapType}
        onChange={(v) => {
          if (!isEditing) setRemapType(v as RemapType);
        }}
      >
        {TYPE_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            value={opt.value}
            title={opt.title}
          />
        ))}
      </Form.Dropdown>

      {isEditing && (
        <Form.Description text="Type cannot be changed when editing. Delete and re-create to change type." />
      )}

      <Form.Separator />

      {remapType === "remap" && (
        <>
          <Form.Dropdown
            id="from"
            title="From Key"
            defaultValue={defaults.from as string}
          >
            {ALL_KEYS.map((k) => (
              <Form.Dropdown.Item key={k} value={k} title={k} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="to"
            title="To Key"
            defaultValue={defaults.to as string}
          >
            {ALL_KEYS.map((k) => (
              <Form.Dropdown.Item key={k} value={k} title={k} />
            ))}
          </Form.Dropdown>
        </>
      )}

      {remapType === "modifier_remap" && (
        <>
          <Form.Dropdown
            id="from"
            title="From Key"
            defaultValue={defaults.from as string}
          >
            {MODIFIER_KEYS.map((k) => (
              <Form.Dropdown.Item key={k} value={k} title={k} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="to"
            title="To Key"
            defaultValue={defaults.to as string}
          >
            {MODIFIER_KEYS.map((k) => (
              <Form.Dropdown.Item key={k} value={k} title={k} />
            ))}
          </Form.Dropdown>
        </>
      )}

      {remapType === "conditional_remap" && (
        <>
          <Form.Dropdown
            id="modifier"
            title="Modifier"
            defaultValue={defaults.modifier as string}
          >
            {MODIFIER_NAMES.map((m) => (
              <Form.Dropdown.Item key={m} value={m} title={m} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="from"
            title="From Key"
            defaultValue={defaults.from as string}
          >
            {ALL_KEYS.map((k) => (
              <Form.Dropdown.Item key={k} value={k} title={k} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="to"
            title="To Key"
            defaultValue={defaults.to as string}
          >
            {ALL_KEYS.map((k) => (
              <Form.Dropdown.Item key={k} value={k} title={k} />
            ))}
          </Form.Dropdown>
        </>
      )}

      {remapType === "tap_hold" && (
        <>
          <Form.Dropdown
            id="key"
            title="Key"
            defaultValue={defaults.key as string}
          >
            {ALL_KEYS.map((k) => (
              <Form.Dropdown.Item key={k} value={k} title={k} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="tap"
            title="Tap Action"
            defaultValue={defaults.tap as string}
          >
            {ALL_KEYS.map((k) => (
              <Form.Dropdown.Item key={k} value={k} title={k} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="hold"
            title="Hold Action"
            defaultValue={defaults.hold as string}
          >
            {ALL_KEYS.map((k) => (
              <Form.Dropdown.Item key={k} value={k} title={k} />
            ))}
          </Form.Dropdown>
          <Form.TextField
            id="timeout_ms"
            title="Timeout (ms)"
            value={timeoutValue}
            onChange={(v) => {
              setTimeoutValue(v);
              if (timeoutError) setTimeoutError(null);
            }}
            error={timeoutError ?? undefined}
          />
        </>
      )}

      {remapType === "chord" && (
        <>
          <Form.TagPicker
            id="keys"
            title="Keys"
            value={keysValue}
            onChange={(v) => {
              setKeysValue(v);
              if (keysError) setKeysError(null);
            }}
            error={keysError ?? undefined}
          >
            {ALL_KEYS.map((k) => (
              <Form.TagPicker.Item key={k} value={k} title={k} />
            ))}
          </Form.TagPicker>
          <Form.Dropdown
            id="emit"
            title="Emit Key"
            defaultValue={defaults.emit as string}
          >
            {ALL_KEYS.map((k) => (
              <Form.Dropdown.Item key={k} value={k} title={k} />
            ))}
          </Form.Dropdown>
          <Form.TextField
            id="window_ms"
            title="Window (ms)"
            value={windowValue}
            onChange={(v) => {
              setWindowValue(v);
              if (windowError) setWindowError(null);
            }}
            error={windowError ?? undefined}
          />
        </>
      )}
    </Form>
  );
}

// Default export for the standalone command
export default function Command() {
  return <AddRemapForm />;
}
