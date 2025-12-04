import React from "react";
import { List } from "@raycast/api";

const EmptyView: React.FC = () => {
  return <List.EmptyView icon="Exclamationmark" title="Type something to get started" />;
};

export default EmptyView;
