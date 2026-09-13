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
  addRemap,
  addModifierRemap,
  addConditionalRemap,
  addTapHold,
  addChord,
  updateRemap,
  RemapType,
  RemapItem,
  RawRemap,
  RawModifierRemap,
  RawConditionalRemap,
  RawTapHold,
  RawChord,
} from "./lib/config";
import { restartService } from "./lib/service";
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

export function AddRemapForm({ onAdd, editItem }: RemapFormProps) {
  const { pop } = useNavigation();
  const isEditing = !!editItem;
  const defaults = getDefaultValues(editItem);
  const [remapType, setRemapType] = useState<RemapType>(
    editItem?.type ?? "conditional_remap",
  );

  async function handleSubmit(values: Record<string, string | string[]>) {
    try {
      if (isEditing) {
        // Build the raw data object for the update
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
              timeout_ms: parseInt(values.timeout_ms as string, 10) || 200,
            };
            break;
          case "chord":
            data = {
              keys: values.keys,
              emit: values.emit,
              window_ms: parseInt(values.window_ms as string, 10) || 100,
            };
            break;
          default:
            throw new Error(`Unknown remap type: ${remapType}`);
        }
        updateRemap(editItem.id, data);
      } else {
        switch (remapType) {
          case "remap":
            addRemap(values.from as string, values.to as string);
            break;
          case "modifier_remap":
            addModifierRemap(values.from as string, values.to as string);
            break;
          case "conditional_remap":
            addConditionalRemap(
              values.modifier as string,
              values.from as string,
              values.to as string,
            );
            break;
          case "tap_hold":
            addTapHold(
              values.key as string,
              values.tap as string,
              values.hold as string,
              parseInt(values.timeout_ms as string, 10) || 200,
            );
            break;
          case "chord":
            addChord(
              values.keys as string[],
              values.emit as string,
              parseInt(values.window_ms as string, 10) || 100,
            );
            break;
        }
      }

      restartService();
      onAdd?.();
      await showToast({
        style: Toast.Style.Success,
        title: isEditing ? "Remap updated" : "Remap added",
      });
      pop();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: isEditing ? "Failed to update remap" : "Failed to add remap",
        message: String(e),
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
            defaultValue={(defaults.timeout_ms as string) ?? "200"}
          />
        </>
      )}

      {remapType === "chord" && (
        <>
          <Form.TagPicker
            id="keys"
            title="Keys"
            defaultValue={defaults.keys as string[]}
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
            defaultValue={(defaults.window_ms as string) ?? "100"}
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
