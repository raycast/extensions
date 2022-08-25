import { ActionPanel, Action, List, Clipboard, getSelectedText, closeMainWindow } from "@raycast/api";
import { useEffect, useState } from "react";
import camelCase from "lodash.camelcase";
import kebabcase from "lodash.kebabcase";
import capitalize from "lodash.capitalize";
import lowercase from "lodash.lowercase";
import uppercase from "lodash.uppercase";
import toupper from "lodash.toupper";
import tolower from "lodash.tolower";
import startcase from "lodash.startcase";
import snakecase from "lodash.snakecase";
import upperfirst from "lodash.upperfirst";
import trim from "lodash.trim";

type TrasformAction = {
  title: string;
  fn: (k: string) => string;
};

const actions: TrasformAction[] = [
  {
    title: "capitalize",
    fn: (t) => capitalize(t),
  },
  {
    title: "toUpper",
    fn: (t) => toupper(t),
  },
  {
    title: "toLower",
    fn: (t) => tolower(t),
  },
  {
    title: "upperFirst",
    fn: (t) => upperfirst(t),
  },
  {
    title: "Trim",
    fn: (t) => trim(t),
  },
  {
    title: "UpperCase",
    fn: (t) => uppercase(t),
  },
  {
    title: "LowerCase",
    fn: (t) => lowercase(t),
  },
  {
    title: "StartCase",
    fn: (t) => startcase(t),
  },
  {
    title: "CamelCase",
    fn: (t) => camelCase(t),
  },
  {
    title: "UpperCamelCase",
    fn: (t) => upperfirst(camelCase(t)),
  },
  {
    title: "KebabCase",
    fn: (t) => kebabcase(t),
  },
  {
    title: "SnakeCase",
    fn: (t) => snakecase(t),
  },
  {
    title: "UpperSnakeCase",
    fn: (t) => toupper(snakecase(t)),
  },
];

export default function Command() {
  const [clipboardText, setClipboardText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [isClipboardTarget, setIsClipboardTarget] = useState<boolean>(false);

  useEffect(() => {
    const fn = async () => {
      const text = (await Clipboard.readText()) || "";
      setClipboardText(text);
      setIsClipboardTarget(!!text);
    };
    fn();
    return () => setClipboardText("");
  }, []);

  const onActionPaste = async (clipboardText: string) => {
    await Clipboard.copy(clipboardText);
    await Clipboard.paste(clipboardText);
    await closeMainWindow();
  };

  const onActionCopy = async () => {
    setSearchText(searchText || clipboardText);
    setIsClipboardTarget(false);
  };

  const onActionSelectCase = async () => {
    setClipboardText(clipboardText);
    setSearchText("");
    setIsClipboardTarget(true);
  };

  const targetText = isClipboardTarget ? clipboardText : searchText;

  const filterdActions = isClipboardTarget
    ? actions.filter((action) => action.title.toUpperCase().includes(searchText.toUpperCase()))
    : actions;

  return (
    <List searchText={searchText} onSearchTextChange={setSearchText}>
      {!isClipboardTarget && (
        <List.Item
          key="type"
          icon="command-icon.png"
          title={`Typing...`}
          accessories={[{ text: "Enter" }]}
          actions={
            <ActionPanel>
              <Action title="Select Case" onAction={() => onActionSelectCase()} />
            </ActionPanel>
          }
        />
      )}
      <List.Section title={`Transform "${targetText}" with`}>
        {filterdActions.map((action) => (
          <List.Item
            key={action.title}
            icon="command-icon.png"
            title={action.title}
            accessories={[{ text: action.fn(targetText) }]}
            actions={
              <ActionPanel>
                <Action title={action.title} onAction={() => onActionPaste(action.fn(targetText))} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {isClipboardTarget && (
        <List.Section title={`Update "${targetText}"`}>
          <List.Item
            key="type"
            icon="command-icon.png"
            title="Update typed text"
            accessories={[{ text: "Enter" }]}
            actions={
              <ActionPanel>
                <Action title="Update text" onAction={() => onActionCopy()} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
