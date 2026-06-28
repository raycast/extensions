import { List, ActionPanel, Action, Icon, getPreferenceValues, Color, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { usePromise } from "@raycast/utils";
import { decode, encode, isValid } from "js-base64";

function _getActions(value: string) {
  const { defaultAction } = getPreferenceValues<Preferences>();

  const actions = [
    <Action.CopyToClipboard key="copyToClipboard" content={value} />,
    <Action.Paste key="pasteInApp" content={value} />,
    ...(isValidUrl(value) ? [<Action.OpenInBrowser key="openInBrowser" url={value} />] : []),
  ];

  const defaultOption = actions.find((action) => action.key === defaultAction);
  const otherOptions = actions.filter((action) => action.key !== defaultAction);

  return (
    <ActionPanel>
      {defaultOption}
      {otherOptions}
    </ActionPanel>
  );
}

export default function Command() {
  const [input, setInput] = useState<string>("");
  const { data: decoded, isLoading: isLoadingDecoded } = usePromise(
    async (text) => isValid(text) && decode(text),
    [input],
  );
  const { data: encoded, isLoading: isLoadingEncoded } = usePromise(async (text) => encode(text), [input]);

  useEffect(() => {
    if (!input) {
      Clipboard.read().then(({ text }) => setInput(text));
    }
  }, [input]);

  return (
    <List
      onSearchTextChange={(value) => setInput(unescapeString(value))}
      searchBarPlaceholder={"Text to encode / decode..."}
      isLoading={isLoadingDecoded || isLoadingEncoded}
    >
      {(encoded || decoded) && (
        <List.Section title={`Input: ${escapeString(input)}`}>
          {encoded && (
            <List.Item
              key={"encode"}
              icon={{ source: Icon.CodeBlock, tintColor: Color.Magenta }}
              title={"Encode"}
              subtitle={encoded}
              actions={_getActions(encoded)}
            />
          )}
          {decoded && (
            <List.Item
              key={"decode"}
              icon={{ source: Icon.Code, tintColor: Color.Purple }}
              title={"Decode"}
              subtitle={escapeString(decoded)}
              actions={_getActions(decoded)}
            />
          )}
        </List.Section>
      )}
      <List.EmptyView
        icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Red }}
        title={"Nothing to Encode / Decode"}
        description={"Copy some content to your clipboard, or start typing text to encode or decode."}
      />
    </List>
  );
}

const escapeString = (input: string) => {
  const escapeMap: { [key: string]: string } = {
    '"': '\\"',
    "'": "\\'",
    "\\": "\\\\",
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t",
  };
  return input.replace(/["'\\\n\r\t]/g, (char) => escapeMap[char]);
};

const unescapeString = (input: string) => {
  const unescapeMap: { [key: string]: string } = {
    '\\"': '"',
    "\\'": "'",
    "\\\\": "\\",
    "\\n": "\n",
    "\\r": "\r",
    "\\t": "\t",
  };
  return input.replace(/\\["'\\nrt]/g, (match) => unescapeMap[match]);
};

const isValidUrl = (input: string) => {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
};
