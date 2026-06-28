import { Action, ActionPanel } from "@raycast/api"
import { DONATION_URL, FEEDBACK_URL } from "../config"

export function MetaActionSection() {
    return (
        <ActionPanel.Section>
            <Action.OpenInBrowser url={DONATION_URL} title={"Buy Us a Coffee"} icon="bmcbrand/bmc-logo.svg" />
            <Action.OpenInBrowser
                url={FEEDBACK_URL}
                title={"Send Feedback & Feature Request"}
                icon="message_icon.svg"
            />
        </ActionPanel.Section>
    )
}
