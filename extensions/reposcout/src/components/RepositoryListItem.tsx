import { Color, Icon, List } from "@raycast/api";
import type { EditorId } from "../preferences/types";
import type { SearchResult } from "../search/search";
import { contractHome } from "../utils/path";
import { formatRelativeTime, kindLabel } from "../utils/display";
import { RepositoryActions } from "./RepositoryActions";

/**
 * Renders a single repository as a Raycast list item, with status/branch/age
 * accessories and the full action panel. Presentation only — all data comes
 * pre-ranked from the search layer.
 */
export interface RepositoryListItemProps {
  readonly result: SearchResult;
  readonly primaryEditor: EditorId;
  readonly terminalApp: string;
  readonly nowMs: number;
  readonly onOpen: (path: string) => void;
  readonly onToggleFavorite: (path: string) => void;
  readonly onTogglePin: (path: string) => void;
  readonly onRefresh: () => void;
  readonly onManageRoots: () => void;
}

/** Icon + color describing working-tree status. */
function statusAccessory(result: SearchResult): List.Item.Accessory | null {
  switch (result.record.status) {
    case "dirty":
      return { icon: { source: Icon.CircleFilled, tintColor: Color.Orange }, tooltip: "Dirty" };
    case "clean":
      return { icon: { source: Icon.CircleFilled, tintColor: Color.Green }, tooltip: "Clean" };
    case "unknown":
      return null;
  }
}

export function RepositoryListItem(props: RepositoryListItemProps): React.JSX.Element {
  const { result, nowMs } = props;
  const { record, userData } = result;

  const accessories: List.Item.Accessory[] = [];

  if (userData.pinned) {
    accessories.push({ icon: { source: Icon.Pin, tintColor: Color.Blue }, tooltip: "Pinned" });
  }
  if (userData.favorite) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" });
  }
  if (record.branch) {
    accessories.push({
      tag: { value: record.branch, color: Color.SecondaryText },
      tooltip: "Current branch",
    });
  }
  const status = statusAccessory(result);
  if (status) {
    accessories.push(status);
  }
  const age = formatRelativeTime(
    record.lastCommitAt === null ? null : record.lastCommitAt * 1000,
    nowMs,
  );
  if (age) {
    accessories.push({ text: age, tooltip: "Last commit" });
  }

  return (
    <List.Item
      title={record.name}
      subtitle={contractHome(record.path)}
      icon={record.kind === "bare" ? Icon.HardDrive : Icon.Folder}
      accessories={accessories}
      keywords={[kindLabel(record.kind), record.branch ?? ""]}
      actions={
        <RepositoryActions
          record={record}
          userData={userData}
          primaryEditor={props.primaryEditor}
          terminalApp={props.terminalApp}
          onOpen={props.onOpen}
          onToggleFavorite={props.onToggleFavorite}
          onTogglePin={props.onTogglePin}
          onRefresh={props.onRefresh}
          onManageRoots={props.onManageRoots}
        />
      }
    />
  );
}
