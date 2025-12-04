import {
  ActionPanel,
  CopyToClipboardAction,
  Icon,
  List,
  ListItem,
  OpenInBrowserAction,
  PasteAction,
} from "@raycast/api";
import fetch from "node-fetch";
import $ from "cheerio";
import { useCallback, useState } from "react";
import { URL } from "url";

const useMergeState = <T extends object>(initialState: T, callback?: (state: T) => void) => {
  const [state, setState] = useState<T>(initialState);
  const setMergedState = useCallback(
    (nextState: Partial<T>) => {
      setState((prevState) => ({
        ...prevState,
        ...nextState,
      }));
      if (callback) callback(state);
    },
    [state, callback],
  );
  return [state, setMergedState] as [T, typeof setMergedState];
};

const getDomainFromSearch = (search: string) => {
  let domain;
  try {
    domain = new URL(search).hostname;
  } catch (e) {
    domain = search;
  }
  return domain;
};

async function fetchLogins(search: string) {
  const domain = getDomainFromSearch(search);

  return fetch(`http://bugmenot.com/view/${domain}`)
    .then((r) => r.text())
    .then((html) => {
      const $html = $.load(html);

      return $html("article.account")
        .toArray()
        .map((el) => {
          const $el = $(el);
          const [login, password, other] = $el
            .find("kbd")
            .toArray()
            .map((el) => $(el).text());
          const rate = $el.find(".success_rate").text();

          return {
            login,
            password,
            rate,
            other,
          };
        });
    });
}

type State = {
  loading: boolean;
  results: Array<{ login: string; password: string; rate: string; other?: string }>;
  domain: string;
};

export default function FindLogin() {
  const [state, setState] = useMergeState<State>({
    loading: false,
    results: [],
    domain: "",
  });

  const onSearch = useCallback((search: string) => {
    if (state.loading) return;

    setState({
      loading: true,
      results: [],
    });

    fetchLogins(search).then((results) => {
      const domain = getDomainFromSearch(search);
      setState({
        loading: false,
        results,
        domain,
      });
    });
  }, []);

  return (
    <List onSearchTextChange={onSearch} throttle isLoading={state.loading} searchBarPlaceholder="Search domain...">
      {state.results.map((result) => {
        const subtitle = result.other ? `${result.password} / ${result.other}` : result.password;

        return (
          <ListItem
            key={result.login}
            title={result.login}
            subtitle={subtitle}
            accessoryTitle={result.rate}
            icon={Icon.Person}
            actions={
              <ActionPanel>
                <PasteAction
                  content={result.login}
                  title="Paste Login"
                  shortcut={{
                    modifiers: ["opt"],
                    key: "l",
                  }}
                />
                <PasteAction
                  content={result.password}
                  title="Paste Password"
                  shortcut={{
                    modifiers: ["opt"],
                    key: "p",
                  }}
                />

                <OpenInBrowserAction url={`http://bugmenot.com/view/${state.domain}`} title="View on BugMeNot" />

                <CopyToClipboardAction content={result.login} title="Copy Login" />
                <CopyToClipboardAction content={result.password} title="Copy Password" />
                {result.other && <CopyToClipboardAction content={result.other} title="Copy Other" />}
              </ActionPanel>
            }
          ></ListItem>
        );
      })}
    </List>
  );
}
