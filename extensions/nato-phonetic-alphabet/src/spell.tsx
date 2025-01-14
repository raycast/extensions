import { ActionPanel, Action, Detail, LaunchProps, List, Icon } from "@raycast/api";
import { DICTIONARY } from "./dictionary";

interface Arguments {
  Term: string;
}

const NEW_LINE = "\r\n\r\n";

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const term = (props.arguments["Term"] || props.fallbackText || "").trim();

  if (!term) {
    return (
      <List>
        <List.EmptyView title="Error" description="Please enter text to spell" icon={Icon.Warning} />
      </List>
    );
  }

  const words = term.split(" ");

  // Map over the word and then map of the characters of that word
  const as_nato = words.map((w: string) => {
    return [...w].map((c: string) => {
      c = c.toLowerCase();

      if (c in DICTIONARY) {
        return {
          character: c,
          telephony: DICTIONARY[c][0],
          pronunciation: DICTIONARY[c][1],
        };
      } else {
        return {
          character: c,
          telephony: c,
          pronunciation: c,
        };
      }
    });
  });

  const as_telephony = as_nato
    .flatMap((n) => {
      return n.map((m) => m.telephony).join(" ");
    })
    .join(NEW_LINE);

  const as_pronunciation = as_nato
    .flatMap((n) => {
      return n.map((m) => m.pronunciation).join(" ");
    })
    .join(NEW_LINE);

  const markdown = `
  ## Telephony
  ${as_telephony}

  ## Pronunciation
  ${as_pronunciation}
  `;

  return (
    <Detail
      navigationTitle={term}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Telephony to Clipboard" content={as_telephony} />
          <Action.CopyToClipboard title="Copy Pronunciation to Clipboard" content={as_pronunciation} />
        </ActionPanel>
      }
    />
  );
}
