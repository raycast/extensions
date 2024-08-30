import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import AddDomain from "./add-domain";
import { Mutate } from "../types";

export function EmptyView(props: { title: string; icon: Icon | Image.ImageLike; type?: string; mutate?: Mutate }) {
  const { title, icon, mutate, type } = props;

  //TODO: Can we clearsearchbar after running AddComain here?
  return (
    <List.EmptyView
      title={title}
      icon={icon}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Plus}
            title="Add New Domain"
            shortcut={Keyboard.Shortcut.Common.New}
            target={<AddDomain type={type ?? ""} mutate={mutate ?? undefined} />}
          />
        </ActionPanel>
      }
    />
  );
}
