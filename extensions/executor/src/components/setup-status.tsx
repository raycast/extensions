import { List, type Image } from "@raycast/api";
import type { ReactNode } from "react";
import { workspaceTitle } from "../lib/workspaces";

export function SetupStatus({
  title,
  description,
  icon,
  actions,
}: {
  title: string;
  description: string;
  icon: Image.ImageLike;
  actions: ReactNode;
}) {
  return (
    <List navigationTitle={workspaceTitle(title)} searchBarPlaceholder="">
      <List.EmptyView icon={icon} title={title} description={description} actions={actions} />
    </List>
  );
}
