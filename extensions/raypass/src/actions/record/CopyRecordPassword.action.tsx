import type { FC } from "react";
import { Action } from "@raycast/api";

interface Props {
  password: string;
}

export const CopyRecordPassword: FC<Props> = ({ password }) => (
  <Action.CopyToClipboard title="Copy Password" content={password} />
);
