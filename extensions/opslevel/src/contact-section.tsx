import { Action, ActionPanel, Keyboard } from "@raycast/api";
import { ContactFragment, ContactType } from "./client";

export default function ContactSection({
    contacts,
    onVisisted,
}: {
    contacts: ContactFragment[] | null | undefined;
    onVisisted: () => void;
}) {
    if (!contacts) return null;

    return (
        <ActionPanel.Section>
            {contacts
                ?.filter((c) => !!c && c.displayName && c.targetHref)
                .map((contact) => (
                    <Action.OpenInBrowser
                        key={contact.targetHref}
                        // eslint-disable-next-line @raycast/prefer-title-case
                        title={`Open ${contact.displayName}`}
                        url={contact.targetHref ?? ""}
                        shortcut={getShortcut(contact.type)}
                        onOpen={onVisisted}
                    />
                ))}
        </ActionPanel.Section>
    );
}

function getShortcut(contact: ContactType): Keyboard.Shortcut | undefined {
    switch (contact) {
        case ContactType.Slack:
        case ContactType.SlackHandle:
            return { modifiers: ["cmd"], key: "s" };
        case ContactType.Web:
            return { modifiers: ["cmd"], key: "w" };
    }
}
