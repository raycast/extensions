import "react";

import { ASWindowOperations, ActionCommandDefaultProps } from "../core";
import { ASItermCommand } from "../components";

export const NewItermTabCommand: React.FC<ActionCommandDefaultProps> = (props) => {
  return (
    <ASItermCommand
      title={"Creating new tab..."}
      errorTitle={"Failed to create new tab"}
      scripts={[
        ASWindowOperations({
          target: "newTab",
          profile: props.profile,
          shellCommands: props.command,
        }),
      ]}
    />
  );
};
