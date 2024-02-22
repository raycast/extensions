import { Action, ActionPanel, Icon } from "@raycast/api";
import { CurrencyRate } from "../../types";

export default function RateActions(props: {
  item: CurrencyRate;
  isPinned: boolean;
  validRearrangeDirections?: { up: boolean; down: boolean };
  onPin: (rate: CurrencyRate) => void;
  onRearrange?: (rate: CurrencyRate, direction: "up" | "down") => void;
}) {
  const { item, isPinned, onPin, onRearrange, validRearrangeDirections } = props;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!item.rateCross ? (
          <>
            <Action.CopyToClipboard title="Copy Sell Rate" content={item.rateSell} />
            <Action.CopyToClipboard title="Copy Buy Rate" content={item.rateBuy} />
          </>
        ) : (
          <Action.CopyToClipboard title="Copy Cross Rate" content={item.rateCross} />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title={!isPinned ? "Pin" : "Unpin"}
          icon={!isPinned ? Icon.Pin : Icon.PinDisabled}
          shortcut={{ key: "p", modifiers: ["cmd", "shift"] }}
          onAction={() => onPin(item)}
        />
        {isPinned && onRearrange && (
          <>
            {validRearrangeDirections?.up && (
              <Action
                title="Move Up in Pinned"
                icon={Icon.ArrowUp}
                shortcut={{ key: "arrowUp", modifiers: ["cmd", "opt"] }}
                onAction={() => onRearrange(item, "up")}
              />
            )}

            {validRearrangeDirections?.down && (
              <Action
                title="Move Down in Pinned"
                icon={Icon.ArrowDown}
                shortcut={{ key: "arrowDown", modifiers: ["cmd", "opt"] }}
                onAction={() => onRearrange(item, "down")}
              />
            )}
          </>
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
