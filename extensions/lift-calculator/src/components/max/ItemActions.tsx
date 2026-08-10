import { Action, ActionPanel, Icon } from "@raycast/api";
import { MAX_RESOURCES } from "../../constants/max";
import { MaxResult } from "../../types/max";
import { formatWeight, formatPercentage } from "../../utils/formatting";

interface ItemActionsProps {
  setShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
  results: MaxResult[];
  unitSystem: "kg" | "lbs";
}

export const ItemActions: React.FC<ItemActionsProps> = ({ setShowingDetail, results, unitSystem }) => {
  const clipboardText = results
    .map(
      (result) =>
        `${result.label}: ${formatWeight(result.value, unitSystem)} (${formatPercentage(result.percentage || 0)})`,
    )
    .join("\n");

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Toggle Detail" icon={Icon.Sidebar} onAction={() => setShowingDetail((prev) => !prev)} />
        <Action.CopyToClipboard icon={Icon.CopyClipboard} title="Copy List to Clipboard" content={clipboardText} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Wikipedia" url={MAX_RESOURCES.LINKS.WIKI} />
        <Action.OpenInBrowser title="Epley Formula" url={MAX_RESOURCES.LINKS.EPLEY_FORMULA} />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
