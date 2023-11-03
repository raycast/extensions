import { Action } from "@raycast/api";

interface Props {
  password: string;
}

export const CopyRecordPassword: React.FC<Props> = ({ password }) => (
  <Action.CopyToClipboard title="Copy Password" content={password} />
);
