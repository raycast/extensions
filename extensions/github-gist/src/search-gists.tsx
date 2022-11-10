import { ActionPanel, Color, List } from "@raycast/api";
import { useState } from "react";
import { githubGists } from "./util/gist-utils";
import { getGistDetailContent, preference } from "./util/utils";
import { getGistContent, showGists } from "./hooks/hooks";
import { GistAction } from "./components/gist-action";
import { GistEmptyView } from "./components/gist-empty-view";
import { ActionOpenPreferences } from "./components/action-open-preferences";

export default function main() {
  const [page, setPage] = useState<number>(1);
  const [route, setRoute] = useState<string>("");
  const [gistParams, setGistParams] = useState<{ route: string; page: number }>({ route: "", page: 1 });
  const [rawURL, setRawURL] = useState<string>("");
  const [refresh, setRefresh] = useState<number>(0);

  const { gists, loading } = showGists(gistParams, refresh);
  const { gistFileContent } = getGistContent(rawURL);

  return (
    <List
      isShowingDetail={preference.detail}
      isLoading={loading}
      searchBarPlaceholder={"Search gists"}
      onSelectionChange={(id) => {
        if (typeof id !== "undefined" && id != null) {
          const { url, gistId } = JSON.parse(id);
          setRawURL(url + "");
          if (gistId === gists[gists.length - 1]?.gist_id) {
            setGistParams({ route: route, page: page + 1 });
            setPage(page + 1);
          }
        }
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="GitHub Gist"
          storeValue={preference.rememberTag}
          onChange={(newValue) => {
            setGistParams({ route: newValue, page: 1 });
            setRoute(newValue);
          }}
        >
          {githubGists.map((value) => {
            return <List.Dropdown.Item key={value} title={value} value={value} />;
          })}
        </List.Dropdown>
      }
    >
      <GistEmptyView title={""} description={"No gist found"} />
      {gists.map((gist, gistIndex, gistArray) => {
        return (
          <List.Section key={"gist" + gistIndex + gist.gist_id} title={gist.description}>
            {gistArray[gistIndex].file.map((gistFile, gistFileIndex, gistFileArray) => {
              return (
                <List.Item
                  id={JSON.stringify({
                    gistIndex: gistIndex,
                    gistFileIndex: gistFileIndex,
                    url: gistFileArray[gistFileIndex].raw_url,
                    gistId: gist.gist_id,
                  })}
                  key={"gistFile" + gistIndex + gistFileIndex}
                  icon={{ source: "gist-icon.svg", tintColor: Color.SecondaryText }}
                  title={gistFile.filename}
                  accessories={[{ text: gistFile.language == "null" ? "Binary" : gistFile.language }]}
                  detail={
                    <List.Item.Detail
                      isLoading={gistFileContent.length === 0}
                      markdown={getGistDetailContent(gistFile, gistFileContent)}
                    />
                  }
                  actions={
                    <ActionPanel>
                      <GistAction
                        gistArray={gistArray}
                        gistIndex={gistIndex}
                        gistFileName={gistFile.filename}
                        gistFileContent={gistFileContent}
                        route={route}
                        setRefresh={setRefresh}
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
