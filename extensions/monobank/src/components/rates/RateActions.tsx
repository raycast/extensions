import { Action, ActionPanel, Icon } from "@raycast/api";
import { STORAGE_KEYS } from "../../data/constants";
import { shortcuts } from "../../data/shortcuts";
import { isMenuBarSupported, showInMenuBar } from "../../services/menuBar";
import { CurrencyRate } from "../../types";
import { getRateTitle } from "../../utils";
import PinActionsSection, { PinProps } from "../PinActionsSection";
import ConvertCurrency from "./ConvertCurrency";

export default function RateActions(props: { rate: CurrencyRate; pin: PinProps }) {
  const { rate, pin } = props;
  // "Convert Currency" takes ⌘⏎ instead of its own shortcut when it's the second action.
  const copyCount =
    rate.rateCross !== undefined ? 1 : [rate.rateSell, rate.rateBuy].filter((r) => r !== undefined).length;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {rate.rateCross !== undefined ? (
          <Action.CopyToClipboard title="Copy Cross Rate" content={rate.rateCross} />
        ) : (
          <>
            {rate.rateSell !== undefined && <Action.CopyToClipboard title="Copy Sell Rate" content={rate.rateSell} />}
            {rate.rateBuy !== undefined && <Action.CopyToClipboard title="Copy Buy Rate" content={rate.rateBuy} />}
          </>
        )}
        <Action.Push
          title="Convert Currency"
          icon={Icon.Coins}
          shortcut={copyCount >= 2 ? shortcuts.convert : undefined}
          target={<ConvertCurrency rate={rate} />}
        />
        {isMenuBarSupported && (
          <Action
            title="Show in Menu Bar"
            icon={Icon.AppWindowSidebarRight}
            shortcut={shortcuts.showInMenuBar}
            onAction={() =>
              showInMenuBar({
                key: STORAGE_KEYS.menuBarRate,
                id: rate.id,
                command: "rates-menu-bar",
                title: getRateTitle(rate),
              })
            }
          />
        )}
      </ActionPanel.Section>

      <PinActionsSection {...pin} />
    </ActionPanel>
  );
}
