import { Action, Icon, type Image } from "@raycast/api";
import { createScriptCommandDeeplink, DeeplinkType } from "@raycast/utils";
import { registerAction } from "./registry";

export interface ScriptCommandActionOptions {
  /** Stable annotation name used in Quick Groups YAML. */
  name: string;
  /** Human-readable title shown in the Action Panel. */
  title: string;
  /** Script Command name, normally derived from its filename. */
  command: string;
  /** Map the resolved annotation target to up to three Script Command arguments. */
  arguments?: (target: string) => string[];
  /** Icon shown for the action. Defaults to the terminal icon. */
  icon?: Image.ImageLike;
  /** Exclude the target and values derived from it from display and search. */
  sensitive?: boolean;
}

export function registerScriptCommandAction(options: ScriptCommandActionOptions): void {
  const icon = options.icon ?? Icon.Terminal;
  const mapArguments = options.arguments ?? ((target: string) => [target]);

  registerAction({
    name: options.name,
    title: options.title,
    icon,
    sensitive: options.sensitive,
    render: (target) => {
      const args = mapArguments(target);
      if (args.length > 3) {
        throw new Error(`Script Command action "${options.name}" returned more than three arguments`);
      }
      if (!args.every((argument) => typeof argument === "string")) {
        throw new Error(`Script Command action "${options.name}" arguments must be strings`);
      }
      return (
        <Action.Open
          title={options.title}
          target={createScriptCommandDeeplink({
            type: DeeplinkType.ScriptCommand,
            command: options.command,
            arguments: args,
          })}
          icon={icon}
        />
      );
    },
  });
}
