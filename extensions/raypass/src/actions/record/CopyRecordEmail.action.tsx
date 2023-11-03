import { Action } from "@raycast/api";

interface Props {
  email: string;
}

export const CopyRecordEmail: React.FC<Props> = ({ email }) => (
  <Action.CopyToClipboard title="Copy Email" content={email} shortcut={{ modifiers: ["cmd"], key: "e" }} />
);
