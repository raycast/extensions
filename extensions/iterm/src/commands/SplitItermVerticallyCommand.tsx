import "react";

import { ASWindowOperations, ActionCommandDefaultProps } from "../core";
import { ASItermCommand } from "../components";

export const SplitItermHVerticallyCommand: React.FC<ActionCommandDefaultProps> = (props) => {
  const scripts = [
    ASWindowOperations({
      target: "currentWindow",
      fallbackTarget: "newWindow",
      profile: props.profile,
      shellCommands: props.command,
      asCommands: (options) => /* applescript */ `
tell current session of ${options.windowVar}
    split vertically with ${options.withProfile()}
end tell
activate
` /* end applescript */,
    }),
  ];

  return (
    <ASItermCommand
      title={"Splitting iTerm window vertically..."}
      errorTitle={"Failed to split window"}
      scripts={scripts}
    />
  );
};
