import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as cheerio from "cheerio";
import { useState } from "react";
import { URL } from "url";

const getDomainFromSearch = (search: string) => {
  let domain;
  try {
    domain = new URL(search).hostname;
  } catch {
    domain = search;
  }
  return domain;
};

async function fetchLogins(search: string) {
  const domain = getDomainFromSearch(search);

  return fetch(`https://bugmenot.com/view/${domain}`)
    .then((r) => r.text())
    .then((html) => {
      const $ = cheerio.load(html);

      return $("article.account")
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

export default function FindLogin() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useCachedPromise(fetchLogins, [searchText], { initialData: [], execute: !!searchText });

  return (
    <List onSearchTextChange={setSearchText} throttle isLoading={isLoading} searchBarPlaceholder="Search domain...">
      {data.map((result) => {
        const subtitle = result.other ? `${result.password} / ${result.other}` : result.password;

        return (
          <List.Item
            key={result.login}
            title={result.login}
            subtitle={subtitle}
            accessories={[{ text: result.rate }]}
            icon={Icon.Person}
            actions={
              <ActionPanel>
                <Action.Paste
                  content={result.login}
                  title="Paste Login"
                  shortcut={{
                    modifiers: ["opt"],
                    key: "l",
                  }}
                />
                <Action.Paste
                  content={result.password}
                  title="Paste Password"
                  shortcut={{
                    modifiers: ["opt"],
                    key: "p",
                  }}
                />

                <Action.OpenInBrowser
                  url={`https://bugmenot.com/view/${getDomainFromSearch(searchText)}`}
                  title="View on BugMeNot"
                />

                <Action.CopyToClipboard content={result.login} title="Copy Login" />
                <Action.CopyToClipboard content={result.password} title="Copy Password" />
                {result.other && <Action.CopyToClipboard content={result.other} title="Copy Other" />}
              </ActionPanel>
            }
          ></List.Item>
        );
      })}
    </List>
  );
}
