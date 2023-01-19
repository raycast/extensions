import React from "react";
import { List, ActionPanel, Action, Clipboard, Icon, getPreferenceValues } from "@raycast/api";

enum DefaultActionPreference {
  CopyToClipboard = "copyToClipboard",
  PasteInApp = "pasteInApp",
  OpenInBrowser = "openInBrowser",
}
interface Preferences {
  defaultAction?: DefaultActionPreference;
}

interface ActionsOpts {
  value: string;
}
function _getActions({ value }: ActionsOpts) {
  const isValidUrl = value && value.startsWith("http");
  const defaultPreference = getPreferenceValues<Preferences>().defaultAction;
  const ACTIONS = [
    <Action.CopyToClipboard key={DefaultActionPreference.CopyToClipboard} content={value} />,
    <Action.Paste key={DefaultActionPreference.PasteInApp} content={value} />,
    isValidUrl ? <Action.OpenInBrowser key={DefaultActionPreference.OpenInBrowser} url={value} /> : null,
  ].filter(Boolean) as React.ReactElement[];
  const defaultAction = ACTIONS.find((action) => action.key === defaultPreference);
  const otherActions = ACTIONS.filter((action) => action.key !== defaultPreference);
  return (
    <ActionPanel>
      <>
        {defaultAction}
        {otherActions}
      </>
    </ActionPanel>
  );
}

export default function Command() {
  const [clipboardText, setClipboardText] = React.useState<string | undefined>(undefined);
  const [input, setInput] = React.useState(clipboardText);
  const [encoded, setEncoded] = React.useState<string | undefined>(undefined);
  const [decoded, setDecoded] = React.useState<string | undefined>(undefined);
  React.useEffect(() => {
    Clipboard.readText().then((clipboardContents) => {
      setClipboardText(clipboardContents);
    });
  }, []);
  React.useEffect(() => {
    const _input = input || clipboardText;
    if (_input) {
      setDecoded(Buffer.from(_input, "base64").toString("utf8"));
      setEncoded(Buffer.from(_input, "utf8").toString("base64"));
    } else {
      setDecoded(undefined);
      setEncoded(undefined);
    }
  }, [input, clipboardText]);

  return (
    <List
      onSearchTextChange={(newValue) => {
        setInput(newValue || clipboardText);
      }}
      searchBarPlaceholder={"Text to encode / decode..."}
    >
      {encoded && decoded ? (
        <>
          <List.Section title={`Input: ${input || clipboardText}`}>
            <List.Item
              key={"encode"}
              icon={Icon.CodeBlock}
              title={"Encode"}
              subtitle={encoded}
              actions={encoded ? _getActions({ value: encoded }) : undefined}
            />
            <List.Item
              key={"decode"}
              icon={Icon.Code}
              title={"Decode"}
              subtitle={decoded}
              actions={decoded ? _getActions({ value: decoded }) : undefined}
            />
          </List.Section>
        </>
      ) : (
        <List.EmptyView
          icon={Icon.QuestionMarkCircle}
          title={"Nothing to Encode / Decode"}
          description={"Copy some content to your clipboard, or start typing text to encode or decode."}
        />
      )}
    </List>
  );
}
