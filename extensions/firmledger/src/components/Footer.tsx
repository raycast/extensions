import { Action, ActionPanel, Icon } from "@raycast/api";
import { LINKS } from "../lib/theme";

/** Help / legal links shown at the bottom of every action panel. */
export function FooterActions() {
  return (
    <ActionPanel.Section title="FirmLedger">
      <Action.OpenInBrowser title="Help Centre" icon={Icon.QuestionMark} url={LINKS.help} />
      <Action.OpenInBrowser title="Terms of Use" icon={Icon.Document} url={LINKS.terms} />
      <Action.OpenInBrowser title="Privacy Policy" icon={Icon.Lock} url={LINKS.privacy} />
    </ActionPanel.Section>
  );
}
