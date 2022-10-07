import type { FC } from "react";
import { Action } from "@raycast/api";
import totp from "totp-generator";


interface Props {
  secret: string;
}

export const CopyRecordTOTP: FC<Props> = ({ secret }) => (
  <Action.CopyToClipboard title="Copy TOTP" content={totp(secret)} shortcut={{ modifiers: ["cmd"], key: "t" }} />
);
