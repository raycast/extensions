import React from "react";

import { ASItermCommand, FinderSelected } from "../components";
import { ASWindowOperations, ActionCommandWithoutBashProps, DEFAULT_EDITOR } from "../core";

export const EditInItermCommand: React.FC<ActionCommandWithoutBashProps> = (props) => {
  return (
    <FinderSelected filter={"files"}>
      {(items) => (
        <ASItermCommand
          title={"Opening files in iTerm..."}
          errorTitle={"Failed to open files in iTerm"}
          scripts={[
            ASWindowOperations({
              profile: props.profile,
              target: "currentWindow",
              fallbackTarget: "newWindow",
              shellCommands: [`${DEFAULT_EDITOR} ${items.map((s) => `"${s}"`).join(" ")}`],
            }),
          ]}
        />
      )}
    </FinderSelected>
  );
};
