import { ActionPanel, Action } from "@raycast/api";
import { Card } from "../utils/interfaces";

export default function CreditCardActions({ card }: { card: Card }) {
  return (
    <ActionPanel title="Credit Card Application">
      <Action.OpenInBrowser title="Apply in Browser" url={`https://link.cardpointers.com/rc/${card.slug}`} />
      <Action.OpenInBrowser
        title="Open Details in Browser"
        url={`https://cardpointers.com/cards/${card.slug}/?b=1`}
        shortcut={{ modifiers: ["cmd"], key: "b" }}
      />
      <Action.OpenInBrowser
        title="Open in CardPointers"
        url={`cardpointers://open/card/${card.card_id}`}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />

      <ActionPanel.Section />

      <Action.CopyToClipboard
        title="Copy Application Link"
        content={`https://link.cardpointers.com/rc/${card.slug}`}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      />
      <Action.CopyToClipboard
        title="Copy Details Link"
        content={`https://cardpointers.com/cards/${card.slug}/`}
        shortcut={{ modifiers: ["cmd"], key: "l" }}
      />
      <Action.CopyToClipboard
        title="Copy Card Title"
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        content={card.title}
      />
    </ActionPanel>
  );
}
