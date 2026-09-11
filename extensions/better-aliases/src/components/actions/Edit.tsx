import { Action, Icon, Keyboard } from "@raycast/api";
import type { ReactElement } from "react";
import type { BetterAliasItem } from "../../schemas";

interface EditActionProps {
  alias: string;
  item: BetterAliasItem;
  itemType: "alias" | "snippet";
  EditComponent: React.ComponentType<{ alias: string; item: BetterAliasItem }>;
}

export function EditAction({ alias, item, itemType, EditComponent }: EditActionProps): ReactElement {
  return (
    <Action.Push
      title={`Edit ${itemType === "alias" ? "Alias" : "Snippet"}`}
      icon={Icon.Pencil}
      shortcut={Keyboard.Shortcut.Common.Edit}
      target={<EditComponent alias={alias} item={item} />}
    />
  );
}
