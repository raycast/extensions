import { ActionPanel, Application, Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { formatGistContentDetail } from "./util/utils";
import { GistAction } from "./components/gist-action";
import { ActionSettings } from "./components/action-settings";
import { perPage, rememberTag, showDetail, defaultGistTag } from "./types/preferences";
import { useFrontmostApp } from "./hooks/useFrontmostApp";
import { withGitHubClient } from "./components/with-github-client";
import { useCachedPromise } from "@raycast/utils";
import { getGitHubClient } from "./api/oauth";
import { GithubGistTag, githubGistTags } from "./util/gist-utils";

function SearchGists() {
  const client = getGitHubClient();
  const [tag, setTag] = useState<GithubGistTag>(GithubGistTag.MY_GISTS);
  const [gistId, setGistId] = useState<string>("");

  const { data: frontmostAppData } = useFrontmostApp();

  const {
    data: gistsData,
    isLoading: gistsLoading,
    mutate: gistMutate,
    pagination,
  } = useCachedPromise(
    (t: string) => async (options) => {
      const data = await client.requestGist(t, options.page + 1, parseInt(perPage));
      const hasMore = data[data.length - 1] != options.lastItem && options.page < 50;
      return { data, hasMore };
    },
    [tag],
    { keepPreviousData: true, failureToastOptions: { title: "Failed to load gists" } },
  );

  const { data: gistContentData, isLoading: gistContentLoading } = useCachedPromise(
    (rawUrl: string) => {
      return client.octokit.request(`${rawUrl}`).then((response) => {
        return response.data;
      }) as Promise<string>;
    },
    [gistId],
    { failureToastOptions: { title: "Failed to load gist content" } },
  );

  const frontmostApp = useMemo(() => {
    return frontmostAppData as Application;
  }, [frontmostAppData]);

  const gists = useMemo(() => {
    if (!gistsData) {
      return [];
    }
    return gistsData;
  }, [gistsData]);

  const gistContent = useMemo(() => {
    if (!gistContentData) {
      return "";
    }
    return gistContentData.toString();
  }, [gistContentData]);

  return (
    <List
      isShowingDetail={showDetail}
      isLoading={gistsLoading}
      pagination={pagination}
      searchBarPlaceholder={"Search gists"}
      onSelectionChange={(id) => {
        if (id) {
          const { url } = JSON.parse(id);
          setGistId(url);
        }
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="GitHub Gist"
          storeValue={rememberTag}
          onChange={(newValue) => {
            setTag(newValue as GithubGistTag);
          }}
        >
          {[
            ...githubGistTags.filter((tag) => tag.value === defaultGistTag),
            ...githubGistTags.filter((tag) => tag.value !== defaultGistTag),
          ].map((tag) => {
            return <List.Dropdown.Item key={tag.title} title={tag.title} value={tag.value} icon={tag.icon} />;
          })}
        </List.Dropdown>
      }
    >
      <List.EmptyView title={"No Gists"} icon={Icon.CodeBlock} />
      {gists?.map((gist, gistIndex) => {
        return (
          <List.Section key={"gist" + gistIndex + gist.gist_id} title={gist.description}>
            {gist.file.map((gistFile, gistFileIndex, gistFileArray) => {
              return (
                <List.Item
                  id={JSON.stringify({
                    gistIndex: gistIndex,
                    gistFileIndex: gistFileIndex,
                    url: gistFileArray[gistFileIndex].raw_url,
                    gistId: gist.gist_id,
                  })}
                  key={"gistFile" + gistIndex + gistFileIndex}
                  icon={{ source: Icon.CodeBlock, tintColor: Color.SecondaryText }}
                  title={{
                    value: gistFile?.filename,
                    tooltip: `${gistFile?.filename}
Size: ${gistFile.size}`,
                  }}
                  accessories={[
                    {
                      text: gistFile.language == "null" ? "Binary" : gistFile.language,
                      tooltip: gistFile.type,
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      isLoading={gistContentLoading}
                      markdown={formatGistContentDetail(gistFile, gistContent)}
                    />
                  }
                  actions={
                    <ActionPanel>
                      <GistAction
                        gist={gist}
                        gistFileName={gistFile.filename}
                        gistFileContent={gistContent}
                        tag={tag}
                        gistMutate={gistMutate}
                        frontmostApp={frontmostApp}
                      />
                      <ActionSettings command={true} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}

export default withGitHubClient(SearchGists);
