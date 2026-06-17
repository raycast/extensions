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
          shortcut={{
            macOS: { key: "p", modifiers: ["cmd", "shift"] },
            Windows: { key: "p", modifiers: ["ctrl", "shift"] },
          }}
          onAction={() => onPin(item)}
        />
        {isPinned && onRearrange && (
          <>
            {validRearrangeDirections?.up && (
              <Action
                title="Move up in Pinned"
                icon={Icon.ArrowUp}
                shortcut={{
                  macOS: { key: "arrowUp", modifiers: ["cmd", "opt"] },
                  Windows: { key: "arrowUp", modifiers: ["ctrl", "alt"] },
                }}
                onAction={() => onRearrange(item, "up")}
              />
            )}

            {validRearrangeDirections?.down && (
              <Action
                title="Move Down in Pinned"
                icon={Icon.ArrowDown}
                shortcut={{
                  macOS: { key: "arrowDown", modifiers: ["cmd", "opt"] },
                  Windows: { key: "arrowDown", modifiers: ["ctrl", "alt"] },
                }}
                onAction={() => onRearrange(item, "down")}
              />
            )}
          </>
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
