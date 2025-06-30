import React from "react";
import { List } from "@raycast/api";
import { parsedJournalFilePath } from "../utils/journalFile";

const SuccessView: React.FC = () => {
  return <List.EmptyView icon="money-face.png" title={`Saved to Journal file`} description={parsedJournalFilePath} />;
};

export default SuccessView;
