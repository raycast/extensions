import type { FC } from "react";
import { Action } from "@raycast/api";

interface Props {
  username: string;
}

export const CopyRecordUsername: FC<Props> = ({ username }) => (
  <Action.CopyToClipboard title="Copy Username" content={username} shortcut={{ modifiers: ["cmd"], key: "u" }} />
);
