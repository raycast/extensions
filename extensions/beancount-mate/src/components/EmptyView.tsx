import React from "react";
import { List } from "@raycast/api";

const EmptyView: React.FC = () => {
  return (
    <List.EmptyView
      icon={"https://cdn-icons-png.flaticon.com/512/4160/4160766.png"}
      title="Type something to get started"
    />
  );
};

export default EmptyView;
