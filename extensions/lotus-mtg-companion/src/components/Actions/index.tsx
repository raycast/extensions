import { Action, Icon, LaunchType, launchCommand } from "@raycast/api";
import { ScryfallCard } from "../../types";

export function SharedCardActions({ card }: { card: ScryfallCard }) {
    return (
        <>
            <Action.OpenInBrowser url={card.scryfall_uri} />
            <Action
                onAction={async () => {
                    launchCommand({
                        name: "searchCards",
                        type: LaunchType.UserInitiated,
                        context: { data: `s:${card.set}` },
                    });
                }}
                title="View All Cards in Set"
                icon={Icon.Tag}
            />
            <Action.CopyToClipboard title="Copy Card Name" content={card.name} />
            <Action.CopyToClipboard title="Copy Card for Scryfall Slackbot" content={`[[${card.name}]]`} />
        </>
    );
}
