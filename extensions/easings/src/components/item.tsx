import { Action, ActionPanel, Grid, Icon } from "@raycast/api";

import Details from "../detail";
import { capitalize } from "../utils/capitalize";
import { CSS, FIGMA, MOTION, MOTION_CUSTOM } from "../utils/constants";

export const gridItem = (type: string, i?: string, o?: string) => {
  return (
    <Grid.Item
      title={capitalize(type)}
      content={`ease-${i ? i + "-" : ""}${o ? o + "-" : ""}${type}.svg`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Cubic Bezier Value"
            content={CSS("ease" + capitalize(i || "") + capitalize(o || "") + capitalize(type))}
          />
          <Action.CopyToClipboard
            title="Copy Figma Easing Value"
            content={FIGMA("ease" + capitalize(i || "") + capitalize(o || "") + capitalize(type))}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.CopyToClipboard
            title="Copy Motion Basic Value"
            content={MOTION("ease" + capitalize(i || "") + capitalize(o || "") + capitalize(type))}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
          <Action.CopyToClipboard
            title="Copy Motion Custom Value"
            content={MOTION_CUSTOM("ease" + capitalize(i || "") + capitalize(o || "") + capitalize(type))}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.Push
            icon={Icon.Wand}
            title="View Animation"
            target={
              <Details
                type={type}
                i={i}
                o={o}
                value={FIGMA("ease" + capitalize(i || "") + capitalize(o || "") + capitalize(type))}
              />
            }
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
        </ActionPanel>
      }
    />
  );
};
