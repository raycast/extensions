import { ActionPanel, Detail, List, Action, Grid } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { CodeGrepperObject } from "./interface";
import axios from "axios";
import * as https from "https";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

async function searchAnswers(query: string | undefined): Promise<CodeGrepperObject | undefined> {
  if (!query || query.length <= 0) return;

  const response = await axios.get("https://www.codegrepper.com/api/get_answers_1.php?v=3&s=" + query, { httpsAgent });

  if (response.status === 200) {
    return await response.data;
  }

  throw Error("Could not fetch data from codegrepper");
}

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const { isLoading, data } = useCachedPromise(
    async (searchText: string | undefined) => await searchAnswers(searchText),
    [searchText],
    { keepPreviousData: true }
  );

  return (
    <List searchBarPlaceholder="query" isLoading={isLoading} throttle onSearchTextChange={setSearchText}>
      {data?.more_answers?.map((answers) => (
        <List.Item
          key={answers.id}
          title={`${answers.profile_slug}'s answer`}
          accessories={[
            { icon: "👍", text: `${answers.upvotes}` },
            { icon: "👎", text: `${answers.downvotes}` },
          ]}
          subtitle={answers.language}
          icon="codegrepper.png"
          actions={
            <ActionPanel>
              <Action.Push
                key={answers.id}
                title="Show Details"
                target={
                  <Detail
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard content={answers.answer}></Action.CopyToClipboard>
                      </ActionPanel>
                    }
                    markdown={"## " + answers.profile_slug + "'s answer\n```" + answers.answer + "```"}
                    navigationTitle="The Code Example"
                  />
                }
              />
              <ActionPanel.Section>
                <Action.OpenInBrowser
                  title="Visit Author's Profile"
                  url={`https://www.codegrepper.com/profile/${encodeURIComponent(answers.profile_slug)}`}
                />
                {answers.donate_link && answers.donate_link.length > 3 && (
                  <Action.OpenInBrowser
                    title={"Donate to the Author (" + answers.fun_name + ")"}
                    url={answers.donate_link}
                  />
                )}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      {!searchText && (
        <List.EmptyView title="Enter query to search code examples on codegrepper.com" icon={"no-view.png"} />
      )}
      {searchText != undefined && searchText?.length > 1 && data?.more_answers.length == 0 && (
        <List.Item title="There is no code example found on codegrepper.com" icon="no-view.png" />
      )}
      {searchText != undefined && searchText?.length > 1 && (
        <>
          <List.Item
            title={`Search in Google`}
            icon="google.png"
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Search in Google"
                  url={`https://www.google.com/search?q=${encodeURIComponent(searchText)}`}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title={`Search in DuckDuckGo`}
            icon="duckduckgo.png"
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Search in DuckDuckGo"
                  url={`https://duckduckgo.com/?q=${encodeURIComponent(searchText)}`}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title={`Search in Bing`}
            icon="bing.png"
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Search in Bing"
                  url={`https://www.bing.com/search?q=${encodeURIComponent(searchText)}`}
                />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
}
