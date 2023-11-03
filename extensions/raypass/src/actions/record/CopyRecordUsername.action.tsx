import { Action } from "@raycast/api";

interface Props {
  username: string;
}

export const CopyRecordUsername: React.FC<Props> = ({ username }) => (
  <Action.CopyToClipboard title="Copy Username" content={username} shortcut={{ modifiers: ["cmd"], key: "u" }} />
);
