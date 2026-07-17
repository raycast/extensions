import { Action, ActionPanel, Icon } from "@raycast/api";
import { WarmupSet } from "../../types/warmup";
import { formatWeight } from "../../utils/formatting";
import { WARMUP_RESOURCES } from "../../constants/warmup";

interface ItemActionsProps {
  setShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
  sets: WarmupSet[];
  unitSystem: "kg" | "lbs";
}

export const ItemActions: React.FC<ItemActionsProps> = ({ setShowingDetail, sets, unitSystem }) => {
  const clipboardText = sets
    .map(
      (set) =>
        `Set ${set.setNumber}: ${formatWeight(set.weight, unitSystem)} × ${set.reps} reps (${(set.percentage * 100).toFixed(0)}%)`,
    )
    .join("\n");

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Toggle Detail" icon={Icon.Sidebar} onAction={() => setShowingDetail((prev) => !prev)} />
        <Action.CopyToClipboard title="Copy List to Clipboard" icon={Icon.CopyClipboard} content={clipboardText} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Wikipedia" url={WARMUP_RESOURCES.LINKS.WIKI} />
        <Action.OpenInBrowser title="Stronger by Science" url={WARMUP_RESOURCES.LINKS.SBS} />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
