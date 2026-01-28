import React from "react";
import { List, ActionPanel, Action, Clipboard, Icon, getPreferenceValues } from "@raycast/api";
import slugify from "slugify";

enum DefaultActionPreference {
  CopyToClipboard = "copyToClipboard",
  PasteInApp = "pasteInApp",
}
interface Preferences {
  defaultAction?: DefaultActionPreference;
}

interface ActionsOpts {
  value: string;
}
function _getActions({ value }: ActionsOpts) {
  const defaultPreference = getPreferenceValues<Preferences>().defaultAction;
  const ACTIONS = [
    <Action.CopyToClipboard key={DefaultActionPreference.CopyToClipboard} content={value} />,
    <Action.Paste key={DefaultActionPreference.PasteInApp} content={value} />,
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

type Result = {
  default: string;
  noLower: string;
  underscore: string;
  underscoreNoLower: string;
};

export default function Command() {
  const [clipboardText, setClipboardText] = React.useState<string | undefined>(undefined);
  const [input, setInput] = React.useState(clipboardText);
  const [result, setResult] = React.useState<Result | undefined>(undefined);
  const [strict, setStrict] = React.useState(true);

  React.useEffect(() => {
    Clipboard.readText().then((clipboardContents) => {
      setClipboardText(clipboardContents ?? "");
    });
  }, []);
  React.useEffect(() => {
    const _input = input || clipboardText;
    if (_input) {
      setResult({
        default: slugify(_input, { lower: true, replacement: "-", strict }),
        noLower: slugify(_input, { lower: false, replacement: "-", strict }),
        underscore: slugify(_input, { lower: true, replacement: "_", strict }),
        underscoreNoLower: slugify(_input, { lower: false, replacement: "_", strict }),
      });
    } else {
      setResult(undefined);
    }
  }, [input, clipboardText, strict]);

  return (
    <List
      onSearchTextChange={(newValue) => {
        setInput(newValue || clipboardText);
      }}
      searchBarPlaceholder={"Text to slugify"}
      isLoading={!clipboardText}
      searchBarAccessory={
        <List.Dropdown tooltip="Strict" onChange={(val) => setStrict(val === "1")}>
          <List.Dropdown.Item icon={Icon.Check} title="Strict" value={"1"} />
          <List.Dropdown.Item icon={Icon.Xmark} title="Not Strict" value="0" />
        </List.Dropdown>
      }
    >
      {result ? (
        <>
          <List.Section title={`Input: ${input || clipboardText}`}>
            {Object.entries(result).map(([key, value]) => (
              <List.Item key={key} title={value} actions={result ? _getActions({ value }) : undefined} />
            ))}
          </List.Section>
        </>
      ) : (
        <List.EmptyView
          icon={Icon.QuestionMarkCircle}
          title={"Nothing to slugify"}
          description={"Copy some content to your clipboard, or start typing text to slugify."}
        />
      )}
    </List>
  );
}
