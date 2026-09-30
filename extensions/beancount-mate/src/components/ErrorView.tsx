import React from "react";
import { List } from "@raycast/api";

const ErrorView: React.FC = () => {
  return (
    <List.EmptyView
      icon={"sth-wrong.png"}
      title="Your typings is invalid"
      description="If you are not familiar with Costflow, Open the syntax Doc ⬇️"
    />
  );
};

export default ErrorView;
