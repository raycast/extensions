import type { Record, RevalidateRecords } from "../../types";
import { Action, Icon } from "@raycast/api";
import { EditRecordForm } from "../../views";

interface Props {
  id: string;
  record: Omit<Record, "id">;
  revalidateRecords: RevalidateRecords;
}

export const EditRecordAction: React.FC<Props> = ({ id, record, revalidateRecords }) => {
  return (
    <Action.Push
      title="Edit Record"
      icon={{ source: Icon.Pencil }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
      target={<EditRecordForm id={id} initialValues={record} revalidateRecords={revalidateRecords} />}
    />
  );
};
