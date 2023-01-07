import { ActionPanel, Action, Detail, LaunchProps } from "@raycast/api";
import { DICTIONARY } from "./dictionary";

interface Arguments {
  Term: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const term = props.arguments["Term"];

  const as_nato = [...term].map((c: string) => {
    if (c in DICTIONARY) {
      return {
        character: c,
        telephony: DICTIONARY[c][0] as string,
        pronunciation: DICTIONARY[c][1] as string,
      };
    } else {
      return {
        character: c,
        telephony: "",
        pronunciation: "",
      };
    }
  });

  const as_telephony = as_nato
    .map((n) => {
      return n.telephony;
    })
    .join(" ");

  const as_pronunciation = as_nato
    .map((n) => {
      return n.pronunciation;
    })
    .join(" ");

  const markdown = `
  ${as_telephony}  
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
