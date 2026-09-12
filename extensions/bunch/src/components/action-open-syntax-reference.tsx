import { Action, Icon } from "@raycast/api";
import React from "react";

export function ActionOpenSyntaxReference() {
  return (
    <Action.OpenInBrowser
      icon={Icon.List}
      title={"Bunch Syntax Reference"}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "s" }}
      url={"https://bunchapp.co/docs/bunch-files/quick-reference/#quick-reference"}
    />
  );
}
