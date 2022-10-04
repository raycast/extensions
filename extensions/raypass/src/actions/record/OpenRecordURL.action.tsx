import type { FC } from "react";
import { Action } from "@raycast/api";

interface Props {
  url: string;
}

export const OpenRecordURL: FC<Props> = ({ url }) => (
  <Action.OpenInBrowser title="Open URL" url={url} shortcut={{ modifiers: ["cmd", "shift"], key: "w" }} />
);
