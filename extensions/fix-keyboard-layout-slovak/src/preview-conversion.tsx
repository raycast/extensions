import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  getSelectedText,
  Icon,
  LaunchProps,
  List,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { convertDirection, detectDirection, Direction, LayoutId } from "./converter";

const DIRECTIONS: { id: Direction; title: string; subtitle: string }[] = [
  { id: "en-to-sk", title: "EN → SK", subtitle: "Typed on English keyboard, meant Slovak" },
  { id: "sk-to-en", title: "SK → EN", subtitle: "Typed on Slovak keyboard, meant English" },
];

/** Show the text literally in the detail pane instead of interpreting it as Markdown. */
function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+\-.!|<>~])/g, "\\$1").replace(/\n/g, "  \n");
}

function detailMarkdown(converted: string, caption: string): string {
  // A single line reads best as a heading; multi-line text stays as paragraphs.
  const body = converted.includes("\n") ? escapeMarkdown(converted) : `## ${escapeMarkdown(converted)}`;
  return `${body}\n\n---\n\n*${caption}*`;
}

export default function Command(props: LaunchProps) {
  const { slovakLayout, keepNumbers } = getPreferenceValues<Preferences>();
  const slovak: LayoutId = slovakLayout === "qwertz" ? "sk-qwertz" : "sk-qwerty";

  const [text, setText] = useState(props.fallbackText ?? "");
  const [isLoading, setIsLoading] = useState(!props.fallbackText);

  // Start with the selected text of the frontmost app, if there is any.
  useEffect(() => {
    if (props.fallbackText) return;
    getSelectedText()
      .then((selected) => {
        if (selected.trim() !== "") setText((current) => current || selected.trim());
      })
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, []);

  const detected = text.trim() ? detectDirection(text, slovak) : undefined;
  const ordered = detected === "sk-to-en" ? [...DIRECTIONS].reverse() : DIRECTIONS;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={text.trim() !== ""}
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder="Type or paste text written with the wrong keyboard layout…"
      filtering={false}
    >
      <List.EmptyView
        icon={Icon.Keyboard}
        title="Type or paste text"
        description={'e.g. "m83 nov0 m]so" → "máš nové mäso"'}
      />
      {text.trim() !== "" &&
        ordered.map((direction) => {
          const converted = convertDirection(text, direction.id, slovak, { keepNumbers });
          return (
            <List.Item
              key={direction.id}
              icon={Icon.Keyboard}
              title={direction.title}
              accessories={direction.id === detected ? [{ tag: { value: "Detected", color: Color.Green } }] : undefined}
              detail={<List.Item.Detail markdown={detailMarkdown(converted, direction.subtitle)} />}
              actions={
                <ActionPanel>
                  <Action.Paste title="Paste Converted Text" content={converted} />
                  <Action.CopyToClipboard title="Copy Converted Text" content={converted} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
