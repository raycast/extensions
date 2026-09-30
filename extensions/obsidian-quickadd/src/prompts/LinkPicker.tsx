import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { LinkTarget } from "../links";
import { loadLinkTargets, VaultRef } from "../suggestions";

const ICONS = { note: Icon.Document, file: Icon.Paperclip, alias: Icon.Link };

/** Searchable list of what `[[` can link to, shown when `[[` is typed in a text field. */
export default function LinkPicker({
  vault,
  onPick,
  onClose,
}: {
  vault: VaultRef;
  onPick: (link: string) => void;
  /** Called when the picker goes away, whether something was picked or Esc was pressed. */
  onClose: () => void;
}) {
  const [targets, setTargets] = useState<LinkTarget[] | undefined>(undefined);

  useEffect(() => {
    let active = true;
    loadLinkTargets(vault).then((loaded) => {
      if (active) setTargets(loaded);
    });
    return () => {
      active = false;
      onClose();
    };
  }, []);

  return (
    <List isLoading={targets === undefined} navigationTitle="Link to Note" searchBarPlaceholder="Search notes">
      <List.EmptyView icon={Icon.Document} title="No matching notes" />
      {(targets ?? []).map((target) => (
        <List.Item
          key={target.id}
          title={target.title}
          subtitle={target.subtitle}
          icon={ICONS[target.kind]}
          actions={
            <ActionPanel>
              <Action title="Insert Link" icon={Icon.Link} onAction={() => onPick(target.link)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
