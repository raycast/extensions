import "react";

import { ASWindowOperations, ActionCommandDefaultProps } from "../core";
import { ASItermCommand } from "../components";

export const NetItermWindowCommand: React.FC<ActionCommandDefaultProps> = (props) => {
  return (
    <ASItermCommand
      title={"Creating new iTerm window..."}
      errorTitle={"Failed to open new iTerm window"}
      scripts={[
        ASWindowOperations({
          target: "newWindow",
          profile: props.profile,
          shellCommands: props.command,
        }),
      ]}
    />
  );
};
