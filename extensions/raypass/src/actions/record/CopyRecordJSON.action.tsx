import type { FC } from "react";
import type { Record } from "../../types";
import { Action } from "@raycast/api";

interface Props {
  record: Record;
}

export const CopyRecordJSON: FC<Props> = ({ record }) => (
  <Action.CopyToClipboard
    title="Copy Record (JSON)"
    content={JSON.stringify(record)}
    shortcut={{ modifiers: ["cmd"], key: "j" }}
  />
);
