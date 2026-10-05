import { Action, ActionPanel, Icon } from "@raycast/api";
import { ManualEventForm } from "./ManualEventForm";
import type { ParsedTimestamp } from "../types";

/**
 * Props shared by every timeline row (parsed and event). Provides the
 * fields consumed by the Compare and New Event action sections, plus
 * the session section passed through from the parent.
 */
export type BaseRowProps = {
  readonly itemId: string;
  readonly offset: string | null;
  readonly referenceId: string | null;
  readonly onSetReference: (id: string) => void;
  readonly onClearReference: () => void;
  readonly onPin: (result: ParsedTimestamp) => Promise<void> | void;
  readonly sessionActions: Parameters<typeof ActionPanel>[0]["children"];
};

export function CompareActions({
  itemId,
  referenceId,
  onSetReference,
  onClearReference,
}: Pick<BaseRowProps, "itemId" | "referenceId" | "onSetReference" | "onClearReference">) {
  return (
    <ActionPanel.Section title="Compare">
      <Action
        title="Set as Reference"
        icon={Icon.BullsEye}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={() => {
          onSetReference(itemId);
        }}
      />
      {referenceId !== null ? (
        <Action title="Clear Reference" icon={Icon.XMarkCircle} onAction={onClearReference} />
      ) : null}
    </ActionPanel.Section>
  );
}

export function NewEventSection({ onPin }: Pick<BaseRowProps, "onPin">) {
  return (
    <ActionPanel.Section title="New">
      <Action.Push
        title="New Manual Event"
        icon={Icon.PlusCircle}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={<ManualEventForm onSubmit={onPin} />}
      />
    </ActionPanel.Section>
  );
}
