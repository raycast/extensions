import { Action, ActionPanel, Clipboard, Icon, List, getPreferenceValues, getSelectedText } from "@raycast/api";
import React from "react";
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

async function getInitialText(): Promise<string> {
  try {
    const selectedText = await getSelectedText();
    if (selectedText) {
      return selectedText;
    }
  } catch {
    // No text selected in the frontmost application.
  }

  return (await Clipboard.readText()) ?? "";
}

type Result = {
  default: string;
  noLower: string;
  underscore: string;
  underscoreNoLower: string;
};

function slugifyResult(value: string, strict: boolean): Result {
  return {
    default: slugify(value, { lower: true, replacement: "-", strict }),
    noLower: slugify(value, { lower: false, replacement: "-", strict }),
    underscore: slugify(value, { lower: true, replacement: "_", strict }),
    underscoreNoLower: slugify(value, { lower: false, replacement: "_", strict }),
  };
}

export default function Command() {
  const [fallbackText, setFallbackText] = React.useState<string | undefined>(undefined);
  const [input, setInput] = React.useState<string | undefined>(undefined);
  const [strict, setStrict] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isActive = true;

    getInitialText().then((text) => {
      if (!isActive) {
        return;
      }
      setFallbackText(text);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, []);

  const source = input || fallbackText;
  const result = source ? slugifyResult(source, strict) : undefined;

  return (
    <List
      filtering={false}
      onSearchTextChange={setInput}
      searchBarPlaceholder={"Text to slugify"}
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Strict" onChange={(val) => setStrict(val === "1")}>
          <List.Dropdown.Item icon={Icon.Check} title="Strict" value={"1"} />
          <List.Dropdown.Item icon={Icon.Xmark} title="Not Strict" value="0" />
        </List.Dropdown>
      }
    >
      {result ? (
        <List.Section title={`Input: ${source}`}>
          {Object.entries(result).map(([key, value]) => (
            <List.Item key={key} title={value} actions={_getActions({ value })} />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon={Icon.QuestionMarkCircle}
          title={"Nothing to slugify"}
          description={"Select some text, copy content to your clipboard, or start typing text to slugify."}
        />
      )}
    </List>
  );
}
