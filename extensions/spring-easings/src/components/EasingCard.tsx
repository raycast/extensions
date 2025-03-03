import { Grid, ActionPanel, Action } from "@raycast/api";
import { SpringEasing, generateSpringConfig } from "../models/easings";
import { getEasingFormat } from "../utils/preferences";

interface EasingCardProps {
  easing: SpringEasing;
}

export function EasingCard({ easing }: EasingCardProps) {
  const { name, values } = easing;
  const { mass, stiffness, damping } = values;
  const format = getEasingFormat();
  const springConfig = generateSpringConfig(easing, format);

  return (
    <Grid.Item
      content={{
        value: { source: "https://neesh.page/spring?m=" + mass + "&s=" + stiffness + "&d=" + damping },
        tooltip: `${name}: mass=${mass}, stiffness=${stiffness}, damping=${damping}`,
      }}
      title={name}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Spring Config"
            content={springConfig}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.OpenInBrowser title="Open Easing Details" url={easing.url} />
        </ActionPanel>
      }
    />
  );
}
