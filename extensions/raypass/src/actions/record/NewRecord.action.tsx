import type { FC } from "react";
import type { RevalidateRecords } from "../../types";
import { Action, Icon } from "@raycast/api";
import { NewRecordForm } from "../../views";

interface Props {
  revalidateRecords: RevalidateRecords;
}

export const NewRecordAction: FC<Props> = ({ revalidateRecords }) => (
  <Action.Push
    icon={Icon.PlusCircle}
    shortcut={{ modifiers: ["cmd"], key: "n" }}
    title="New Record"
    target={<NewRecordForm revalidateRecords={revalidateRecords} />}
  />
);
