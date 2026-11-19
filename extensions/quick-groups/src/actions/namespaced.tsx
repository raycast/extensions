import { Action, Icon } from "@raycast/api";
import { createScriptCommandDeeplink, DeeplinkType } from "@raycast/utils";
import { expandHomePath } from "../action-targets";
import { registerActionResolver } from "./registry";

function humanize(value: string): string {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

registerActionResolver({
  prefix: "application/",
  resolve: (name) => {
    const application = name.slice("application/".length).trim();
    if (!application || application.includes("/")) return undefined;
    return {
      name,
      title: `Open in ${application}`,
      icon: Icon.AppWindow,
      render: (target) => (
        <Action.Open
          title={`Open in ${application}`}
          target={expandHomePath(target)}
          application={application}
          icon={Icon.AppWindow}
        />
      ),
    };
  },
});

registerActionResolver({
  prefix: "raycast/script/",
  resolve: (name) => {
    const command = name.slice("raycast/script/".length).trim();
    if (!command || command.includes("/")) return undefined;
    const title = `Run ${humanize(command)}`;
    return {
      name,
      title,
      icon: Icon.Terminal,
      render: (target) => (
        <Action.Open
          title={title}
          target={createScriptCommandDeeplink({
            type: DeeplinkType.ScriptCommand,
            command,
            arguments: [target],
          })}
          icon={Icon.Terminal}
        />
      ),
    };
  },
});
