import { Action, Icon } from "@raycast/api";
import { Song } from "../types";

interface RefreshActionProps {
  onRefresh: () => void | Promise<Song[]>;
}

export default function RefreshAction({ onRefresh }: RefreshActionProps) {
  return <Action icon={Icon.RotateClockwise} title="Refresh" onAction={onRefresh} />;
}
