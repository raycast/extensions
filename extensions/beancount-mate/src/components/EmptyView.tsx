import React from "react";
import { List } from "@raycast/api";

const EmptyView: React.FC = () => {
  return <List.EmptyView icon="smile-face.png" title="Type something to get started" />;
};

export default EmptyView;
