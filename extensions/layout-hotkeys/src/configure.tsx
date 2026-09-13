import {
  Action,
  ActionPanel,
  Form,
  Icon,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  InputSource,
  SLOTS,
  Slot,
  getSlots,
  listSources,
  setSlots,
} from "./lib/input-source";

const UNASSIGNED = "";

async function load() {
  const [sources, slots] = await Promise.all([listSources(), getSlots()]);
  return { sources, slots };
}

export default function Command() {
  const { data, error } = usePromise(load);

  if (error) {
    return (
      <Form>
        <Form.Description
          title="Could not read input sources"
          text={error.message}
        />
      </Form>
    );
  }

  // The dropdowns are only mounted once the layouts are known. Mounting them
  // earlier would leave them holding an initial value chosen against an empty
  // item list, which is not re-evaluated when the real list arrives.
  if (!data) {
    return <Form isLoading />;
  }

  return <ConfigureForm sources={data.sources} slots={data.slots} />;
}

function ConfigureForm({
  sources,
  slots,
}: {
  sources: InputSource[];
  slots: Map<Slot, string | undefined>;
}) {
  // Before anything has been configured, resolveSlot falls back to the nth
  // enabled layout. Show that same fallback here so the form describes what the
  // hotkeys will actually do rather than claiming nothing is assigned.
  const untouched = SLOTS.every((slot) => !slots.get(slot));

  const [assignments, setAssignments] = useState<Map<Slot, string>>(
    () =>
      new Map(
        SLOTS.map((slot) => {
          const stored = slots.get(slot);
          // An id stored before its layout was removed in System Settings
          // matches no dropdown item, so treat it as unassigned instead of
          // rendering a blank field.
          if (stored && sources.some((source) => source.id === stored)) {
            return [slot, stored];
          }
          return [
            slot,
            untouched ? (sources[slot - 1]?.id ?? UNASSIGNED) : UNASSIGNED,
          ];
        }),
      ),
  );

  async function save() {
    await setSlots(assignments);
    await showToast({
      style: Toast.Style.Success,
      title: "Saved",
      message: "Bind a hotkey to each Switch to Layout command",
    });
    await popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Slots"
            icon={Icon.Check}
            onSubmit={save}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Pick the input source each Switch to Layout hotkey should select." />
      {SLOTS.map((slot) => (
        <Form.Dropdown
          key={slot}
          id={`layout${slot}`}
          title={`Layout ${slot}`}
          value={assignments.get(slot) ?? UNASSIGNED}
          onChange={(id) =>
            setAssignments((current) => new Map(current).set(slot, id))
          }
        >
          <Form.Dropdown.Item
            value={UNASSIGNED}
            title="Not Assigned"
            icon={Icon.Minus}
          />
          {sources.map((source) => (
            <Form.Dropdown.Item
              key={source.id}
              value={source.id}
              title={source.name}
              icon={Icon.Keyboard}
            />
          ))}
        </Form.Dropdown>
      ))}
    </Form>
  );
}
