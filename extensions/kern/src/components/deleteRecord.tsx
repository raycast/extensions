import { Action, Icon } from "@raycast/api";
import React, { useCallback } from "react";
import type { Session } from "../types";

const DeleteRecordAction = ({
  state,
  id,
}: {
  state: [Session[], React.Dispatch<React.SetStateAction<Session[]>>];
  id: Session["id"];
}) => {
  const [timeRecords, setTimeRecords] = state;

  const handleDelte = useCallback(() => {
    setTimeRecords(timeRecords.filter((tr) => tr.id !== id));
  }, [state]);

  return <Action icon={Icon.Pencil} title="Delete Record" onAction={handleDelte} />;
};

export { DeleteRecordAction };
