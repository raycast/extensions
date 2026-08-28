import { List } from "@raycast/api";
import type { Image } from "@raycast/api";
import type { Issue } from "../../types/api";
import IssueActions from "./issue-actions";
import { IssueKindPresentation, type IssueKind } from "./issue-kind";

type IssueItemProps = {
  icon: Image.ImageLike;
  item: Issue;
  kind: IssueKind;
};

export default function IssueItem({ icon, item, kind }: IssueItemProps) {
  return (
    <List.Item
      title={item.title || "[No Title]"}
      subtitle={item.repository?.full_name || "[No Repository]"}
      icon={icon}
      accessories={[{ text: `#${item.number ?? ""}` }]}
      actions={<IssueActions item={item} kind={kind} />}
    />
  );
}

export function getIssueItemKey(item: Issue, kind: IssueKind): string | number {
  return item.id || item.number || item.title || IssueKindPresentation[kind].createFallbackKey;
}
