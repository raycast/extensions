import "react";

import { ASItermCommand, FinderSelected } from "../components";
import { ASWindowOperations, ActionCommandWithoutBashProps } from "../core";

export const OpenItermHereCommand: React.FC<ActionCommandWithoutBashProps> = (props) => {
  return (
    <FinderSelected filter={"directories"}>
      {(items) => (
        <ASItermCommand
          title={"Opening paths in iTerm..."}
          errorTitle={"Failed to open paths in iTerm"}
          sequence={true}
          scripts={items.map((item, i) =>
            ASWindowOperations({
              target: i === 0 ? "newWindow" : "newTab",
              profile: props.profile,
              shellCommands: [`cd "${item}"`],
            }),
          )}
        />
      )}
    </FinderSelected>
  );
};
