import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { detailMarkdown, Explanation, explainUrl, parseExplainPage, plainHelp, Token } from "./parse";

// One color per program in the line, reused if there are more than seven. Shell syntax is grey.
const GROUP_COLORS = [Color.Blue, Color.Green, Color.Orange, Color.Purple, Color.Magenta, Color.Yellow, Color.Red];

function tokenColor(token: Token): Color {
  const index = Number(token.group.replace("command", ""));
  return token.group === "shell" ? Color.SecondaryText : GROUP_COLORS[index % 7];
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

  const { data, isLoading, error } = useFetch<Explanation>(explainUrl(command), {
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
        <List.EmptyView icon={Icon.WifiDisabled} title="Could not load the explanation" description={error.message} />
      ) : data && "error" in data ? (
        <List.EmptyView icon={Icon.Warning} title={data.error} description={data.detail} />
      ) : (
        tokens.map((token, index) => (
          <List.Item
            key={index}
            title={token.text}
            icon={tokenIcon(token)}
            detail={<List.Item.Detail markdown={detailMarkdown(data?.command ?? command, tokens, token, tokenColor)} />}
            actions={
              <ActionPanel>
                {token.help && (
                  <Action.CopyToClipboard
                    title="Copy Help Text"
                    content={plainHelp(token.help)}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                )}
                <Action.OpenInBrowser url={explainUrl(data?.command ?? command)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
