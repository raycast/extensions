import { ActionPanel, Application, Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { GithubGistTag, githubGistTags } from "./util/gist-utils";
import { formatGistContentDetail } from "./util/utils";
import { GistAction } from "./components/gist-action";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { useGists } from "./hooks/useGists";
import { rememberTag, showDetail } from "./types/preferences";
import { useGistContent } from "./hooks/useGistContent";
import { useFrontmostApp } from "./hooks/useFrontmostApp";

export default function main() {
  const [tag, setTag] = useState<GithubGistTag>(GithubGistTag.MY_GISTS);
  const [gistId, setGistId] = useState<string>("");

  const { data: frontmostAppData } = useFrontmostApp();
  const { data: gistsData, isLoading: gistsLoading, mutate: gistMutate, pagination } = useGists(tag);
  const { data: gistContentData, isLoading: gistContentLoading } = useGistContent(gistId);

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
          {githubGistTags.map((tag) => {
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
                    value: gistFile.filename,
                    tooltip: `${gistFile.filename}
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
                        fronstmostApp={frontmostApp}
                      />
                      <ActionOpenPreferences command={true} />
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
