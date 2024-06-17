import { Image, List } from "@raycast/api";
import { WorkspaceSchema } from "../types";

export const WorkspaceAccessory = ({
  isLoading,
  setWorkspaceId,
  revalidate,
  workspaces,
}: {
  isLoading: boolean;
  setWorkspaceId: (val: string) => void;
  revalidate: () => void;
  workspaces?: WorkspaceSchema[];
}) => (
  <List.Dropdown
    tooltip="Select Workspace"
    placeholder="Select Workspace"
    storeValue
    filtering
    isLoading={isLoading}
    onChange={(val) => {
      setWorkspaceId(val);
      revalidate();
    }}
  >
    {(workspaces ?? []).map((w) => (
      <List.Dropdown.Item
        key={w.id}
        title={w.name}
        value={w.id}
        keywords={[w.id, w.name, w.slug]}
        icon={{ source: w.logo ?? "command-icon.png", mask: Image.Mask.Circle }}
      />
    ))}
  </List.Dropdown>
);
