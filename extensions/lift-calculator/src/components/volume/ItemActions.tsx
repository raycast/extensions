// components/volume/ItemActions.tsx
import { Action, ActionPanel, Icon } from "@raycast/api";
import { VolumeResult } from "../../types/volume";
import { formatWeight } from "../../utils/formatting";
import { VOLUME_RESOURCES } from "../../constants/volume";

interface ItemActionsProps {
  results: VolumeResult[];
  unitSystem: "kg" | "lbs";
  setShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ItemActions: React.FC<ItemActionsProps> = ({ results, unitSystem, setShowingDetail }) => {
  const formattedResults = results
    .map((result) => {
      return (
        `${result.goal.toUpperCase()}\n` +
        `${result.scheme.sets}x${result.scheme.reps} @ ${formatWeight(result.weight, unitSystem)}\n` +
        `Rest: ${result.scheme.restMinutes} min | Volume: ${formatWeight(result.totalVolume, unitSystem)}\n`
      );
    })
    .join("\n");

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Toggle Detail View" icon={Icon.Sidebar} onAction={() => setShowingDetail((prev) => !prev)} />
        <Action.CopyToClipboard title="Copy List to Clipboard" icon={Icon.CopyClipboard} content={formattedResults} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Wikipedia" url={VOLUME_RESOURCES.LINKS.WIKI} />
        <Action.OpenInBrowser title="Training Volume Research" url={VOLUME_RESOURCES.LINKS.GENERAL} />
        <Action.OpenInBrowser title="Volume & Hypertrophy" url={VOLUME_RESOURCES.LINKS.HYPERTROPHY} />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
