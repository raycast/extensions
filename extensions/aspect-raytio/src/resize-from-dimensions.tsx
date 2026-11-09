import { useState } from "react";
import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import {
  Dimensions,
  ResizeResult,
  formatDimensions,
  formatRatio,
  parseQuery,
  reduceRatio,
  resize,
} from "../lib/resize";

function ResizeActions(props: { result: ResizeResult; ratio: string }) {
  const { result, ratio } = props;
  const full = formatDimensions(result);

  return (
    <ActionPanel>
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard icon={{ source: Icon.Maximize }} title={`Copy Full: ${full}`} content={full} />
        <Action.Paste icon={{ source: Icon.Clipboard }} title={`Paste Full: ${full}`} content={full} />
        <Action.CopyToClipboard
          icon={{ source: Icon.Ruler }}
          title={`Copy Width: ${result.width}`}
          content={result.width}
          shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
        />
        <Action.CopyToClipboard
          icon={{ source: Icon.Ruler }}
          title={`Copy Height: ${result.height}`}
          content={result.height}
          shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
        />
        <Action.CopyToClipboard
          icon={{ source: Icon.AppWindowGrid2x2 }}
          title={`Copy Raytio: ${ratio}`}
          content={ratio}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function RatioItem(props: { original: Dimensions; ratio: string; hint: string }) {
  const { original, ratio, hint } = props;

  return (
    <List.Item
      icon={Icon.AppWindowGrid2x2}
      title={ratio}
      subtitle={formatDimensions(original)}
      accessories={[{ text: hint }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            icon={{ source: Icon.AppWindowGrid2x2 }}
            title={`Copy Raytio: ${ratio}`}
            content={ratio}
          />
          <Action.Paste icon={{ source: Icon.Clipboard }} title={`Paste Raytio: ${ratio}`} content={ratio} />
        </ActionPanel>
      }
    />
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.ResizeFromDimensions }>) {
  const { original: originalArgument = "", newSize: newSizeArgument = "" } = props.arguments;
  const [searchText, setSearchText] = useState(newSizeArgument.trim());

  const query = parseQuery(originalArgument, searchText);

  return (
    <List
      searchBarPlaceholder="New size, e.g. 1000 (or 1200x900 600 to change the original)"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {renderContent(query)}
    </List>
  );
}

function renderContent(query: ReturnType<typeof parseQuery>) {
  if (!query.original.ok) {
    return (
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Invalid Original Size"
        description={`${query.original.error}. Type it in the search bar, e.g. 1000x800 1000`}
      />
    );
  }

  const original = query.original.value;
  const ratio = formatRatio(reduceRatio(original));

  if (!query.newSize) {
    return <RatioItem original={original} ratio={ratio} hint="Type a new size to resize" />;
  }

  if (!query.newSize.ok) {
    return <RatioItem original={original} ratio={ratio} hint={query.newSize.error} />;
  }

  return (
    <List.Section title={`Raytio ${ratio}`} subtitle={`Original ${formatDimensions(original)}`}>
      {resize(original, query.newSize.value).map((result) => (
        <List.Item
          key={result.id}
          id={result.id}
          icon={result.id === "new-width" ? Icon.ArrowRight : Icon.ArrowDown}
          title={formatDimensions(result)}
          subtitle={result.label}
          accessories={
            result.rounded ? [{ tag: "Rounded", tooltip: "Rounded to fit the output precision" }] : undefined
          }
          actions={<ResizeActions result={result} ratio={ratio} />}
        />
      ))}
    </List.Section>
  );
}
