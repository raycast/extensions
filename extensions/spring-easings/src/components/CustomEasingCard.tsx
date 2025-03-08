import { Grid, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { SpringEasing, generateSpringConfig } from "../models/easings";
import { removeCustomEasing } from "../utils/storage";
import { getEasingFormat } from "../utils/preferences";

interface CustomEasingCardProps {
  easing: SpringEasing;
  onEasingRemoved: () => void;
}

export function CustomEasingCard({ easing, onEasingRemoved }: CustomEasingCardProps) {
  const { name, values } = easing;
  const { mass, stiffness, damping } = values;
  const format = getEasingFormat();
  const springConfig = generateSpringConfig(easing, format);

  async function handleDelete() {
    try {
      await removeCustomEasing(name);
      await showToast(Toast.Style.Success, "Easing removed");
      onEasingRemoved();
    } catch (error) {
      console.error("Failed to remove easing:", error);
      await showToast(Toast.Style.Failure, "Failed to remove easing");
    }
  }

  const imageUrl = `https://neesh.page/spring?m=${mass}&s=${stiffness}&d=${damping}`;

  return (
    <Grid.Item
      content={{
        value: { source: imageUrl },
        tooltip: `${name}: mass=${mass}, stiffness=${stiffness}, damping=${damping}`,
      }}
      title={name}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Spring Config"
            content={springConfig}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            title="Delete Custom Easing"
            icon={Icon.Trash}
            onAction={handleDelete}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["opt"], key: "x" }}
          />
        </ActionPanel>
      }
    />
  );
}
