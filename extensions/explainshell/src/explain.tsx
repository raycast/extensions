import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { detailMarkdown, Explanation, explainUrl, parseExplainPage, plainHelp, Token } from "./parse";

// One color per program in the line, reused if there are more than seven. Shell syntax is grey.
const GROUP_COLORS = [Color.Blue, Color.Green, Color.Orange, Color.Purple, Color.Magenta, Color.Yellow, Color.Red];

// The SVG picture takes literal colours: Raycast resolves its own palette names in the Markdown
// renderer, but an SVG `fill` cannot follow the theme, so these are mid-tones that stay readable on
// both the light and the dark pane. The list icons keep the theme-aware Color tokens above.
const GROUP_HEX = ["#2f7de1", "#2f9e58", "#c96f06", "#9061d9", "#d6408f", "#a87c00", "#d94a4a"];
const SHELL_HEX = "#8e8e93";

// `group` is "shell" or "commandN", so anything else indexes NaN and is drawn as shell syntax.
// That covers "shell" itself and cached results from a version whose tokens had no `group`.
const groupIndex = (token: Token) => Number(token.group?.replace("command", ""));

function tokenColor(token: Token): Color {
  const index = groupIndex(token);
  return Number.isNaN(index) ? Color.SecondaryText : GROUP_COLORS[index % 7];
}

function tokenFill(token: Token): string {
  const index = groupIndex(token);
  return Number.isNaN(index) ? SHELL_HEX : GROUP_HEX[index % 7];
}

function tokenIcon(token: Token) {
  const source = token.isCommand ? Icon.Terminal : token.help ? Icon.Dot : Icon.QuestionMark;
  return { source, tintColor: tokenColor(token) };
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [command, setCommand] = useState("");

  // Wait for a pause before fetching: typing a command otherwise sends one request per prefix of it.
  useEffect(() => {
    const timer = setTimeout(() => setCommand(searchText.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data, isLoading, error, revalidate } = useFetch<Explanation>(explainUrl(command), {
    execute: command.length > 0,
    keepPreviousData: true,
    parseResponse: async (response) => {
      if (!response.ok) throw new Error(`explainshell.com answered ${response.status}`);
      // Read the command back from the URL, so a late response is never checked against newer input.
      const requested = new URL(response.url).searchParams.get("cmd") ?? "";
      return parseExplainPage(await response.text(), requested);
    },
  });

  const tokens = command && data && "tokens" in data ? data.tokens : [];

  return (
    <List
      filtering={false}
      throttle
      isLoading={isLoading}
      isShowingDetail={!error && tokens.length > 0}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type a shell command, e.g. tar xzvf archive.tar.gz"
    >
      {!command ? (
        <List.EmptyView icon={Icon.Terminal} title="Type a shell command" />
      ) : error ? (
        <List.EmptyView
          icon={Icon.WifiDisabled}
          title="Could not load the explanation"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : data && "error" in data ? (
        <List.EmptyView icon={Icon.Warning} title={data.error} description={data.detail} />
      ) : (
        tokens.map((token, index) => (
          <List.Item
            key={index}
            title={token.text}
            icon={tokenIcon(token)}
            detail={<List.Item.Detail markdown={detailMarkdown(data?.command ?? command, tokens, token, tokenFill)} />}
            actions={
              <ActionPanel>
                {token.help && <Action.CopyToClipboard title="Copy Help Text" content={plainHelp(token.help)} />}
                <Action.OpenInBrowser url={explainUrl(data?.command ?? command)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
