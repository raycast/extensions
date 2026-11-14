import { Image, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { avatarIcon } from "../lib/format";
import type { Workspace } from "../lib/types";

export function workspaceIcon(workspace: Workspace): Image.ImageLike {
  return avatarIcon(workspace.avatar_url, Image.Mask.RoundedRectangle) ?? getAvatarIcon(workspace.name);
}

export function WorkspaceDropdown(props: {
  workspaces: Workspace[] | undefined;
  value: Workspace | undefined;
  onChange: (id: string) => void;
}) {
  const { workspaces, value, onChange } = props;
  if (!workspaces || workspaces.length < 2) return null;

  return (
    <List.Dropdown tooltip="Workspace" value={value?.id} onChange={onChange}>
      <List.Dropdown.Section title="Workspace">
        {workspaces.map((w) => (
          <List.Dropdown.Item key={w.id} value={w.id} title={w.name} icon={workspaceIcon(w)} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
