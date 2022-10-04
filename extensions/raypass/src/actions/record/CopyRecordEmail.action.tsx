import type { FC } from "react";
import { Action } from "@raycast/api";

interface Props {
  email: string;
}

export const CopyRecordEmail: FC<Props> = ({ email }) => (
  <Action.CopyToClipboard title="Copy Email" content={email} shortcut={{ modifiers: ["cmd"], key: "e" }} />
);
