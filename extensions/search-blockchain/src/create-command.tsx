import Search from "#/commands/Search";
import type { CommandProps } from "#/types";

export function createCommand(appName: string) {
  return function Command(props: CommandProps) {
    return Search({ ...props, appName });
  };
}
