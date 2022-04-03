import {
  List,
  ActionPanel,
  Action,
  Icon,
  Clipboard,
  open,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  deleteGist,
  Gist,
  GITHUB_GISTS,
  githubGists,
  octokit,
  requestGist,
  starGist,
  unStarGist,
} from "./util/gist-utils";
import { isEmpty, preference } from "./util/utils";
import CreateGist from "./create-gist";

export default function main() {
  const [route, setRoute] = useState<string>("");
  const [gists, setGists] = useState<Gist[]>([]);
  const [rawURL, setRawURL] = useState<string>("");
  const [gistFileContent, setGistFileContent] = useState<string>("");
  const [refresh, setRefresh] = useState<boolean>(false);
  const { push } = useNavigation();

  useEffect(() => {
    async function _fetchBuildInShortcut() {
      try {
        setGists([]);
        const _gists = await requestGist(route);
        setGists(_gists);
      } catch (e) {
        await showToast(Toast.Style.Failure, String(e));
      }
    }

    _fetchBuildInShortcut().then();
  }, [route, refresh]);

  useEffect(() => {
    async function _fetchBuildInShortcut() {
      if (!isEmpty(rawURL)) {
        setGistFileContent("");
        const { data } = await octokit.request(`GET ${rawURL}`);
        setGistFileContent(data);
      }
    }

    _fetchBuildInShortcut().then();
  }, [rawURL]);

  return (
    <List
      isShowingDetail={preference.detail}
      isLoading={gists.length === 0}
      searchBarPlaceholder={"Search Gist"}
      onSelectionChange={(id) => {
        if (typeof id !== "undefined" && id != null) {
          setRawURL(id + "");
        }
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="GitHub Gist"
          storeValue={preference.rememberTag}
          onChange={(newValue) => {
            setRoute(newValue);
          }}
        >
          {githubGists.map((value) => {
            return <List.Dropdown.Item key={value} title={value} value={value} />;
          })}
        </List.Dropdown>
      }
    >
      {gists.map((gist, gistIndex, gistArray) => {
        return (
          <List.Section id={"gist" + gistIndex} key={"gist" + gistIndex} title={gist.description}>
            {gistArray[gistIndex].file.map((gistFile, gistFileIndex, gistFileArray) => {
              return (
                <List.Item
                  id={gistFileArray[gistFileIndex].raw_url}
                  key={"gistFile" + gistIndex + gistFileIndex}
                  icon={Icon.TextDocument}
                  title={gistFile.filename}
                  accessories={[{ text: gistFile.language }]}
                  detail={
                    <List.Item.Detail
                      isLoading={gistFileContent.length === 0}
                      markdown={`\`\`\`\n${gistFileContent}`}
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title={preference.primaryAction === "copy" ? "Copy to Clipboard" : "Paste to Active App"}
                        icon={preference.primaryAction === "copy" ? Icon.Clipboard : Icon.Window}
                        onAction={async () => {
                          if (preference.primaryAction === "copy") {
                            await Clipboard.copy(gistFileContent);
                            await showToast(Toast.Style.Success, "Copy Gist to Clipboard");
                          } else {
                            await Clipboard.paste(gistFileContent);
                            await showHUD("Paste to Active App");
                          }
                        }}
                      />
                      <Action
                        title={preference.primaryAction === "copy" ? "Paste to Active App" : "Copy to Clipboard"}
                        icon={preference.primaryAction === "copy" ? Icon.Window : Icon.Clipboard}
                        onAction={async () => {
                          if (preference.primaryAction === "copy") {
                            await Clipboard.paste(gistFileContent);
                            await showHUD("Paste to Active App");
                          } else {
                            await Clipboard.copy(gistFileContent);
                            await showToast(Toast.Style.Success, "Copy Gist to Clipboard");
                          }
                        }}
                      />

                      <Action
                        title={"Copy Gist Link"}
                        icon={Icon.Link}
                        shortcut={{ modifiers: ["cmd"], key: "l" }}
                        onAction={async () => {
                          await Clipboard.copy(gistArray[gistIndex].html_url);
                          await showToast(Toast.Style.Success, "Copy Gist Link");
                        }}
                      />
                      <Action
                        title={"Open in Browser"}
                        icon={Icon.Globe}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                        onAction={async () => {
                          await open(gistArray[gistIndex].html_url);
                          await showHUD("Open Gist in Browser");
                        }}
                      />

                      <ActionPanel.Section title={"Gist Actions"}>
                        {(() => {
                          switch (route) {
                            case GITHUB_GISTS.MY_GISTS: {
                              return (
                                <>
                                  <Action
                                    title={"Star Gist"}
                                    icon={Icon.Star}
                                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                                    onAction={async () => {
                                      const response = await starGist(gistArray[gistIndex].gist_id);
                                      if (response.status == 204) {
                                        await showToast(Toast.Style.Success, "Star Gist Success");
                                      } else {
                                        await showToast(Toast.Style.Failure, "Star Gist Failure");
                                      }
                                    }}
                                  />
                                  <Action
                                    title={"Edit Gist"}
                                    icon={Icon.Pencil}
                                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                                    onAction={async () => {
                                      push(<CreateGist gist={gistArray[gistIndex]} />);
                                    }}
                                  />
                                  <Action
                                    title={"Delete Gist"}
                                    icon={Icon.Trash}
                                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                                    onAction={async () => {
                                      const response = await deleteGist(gistArray[gistIndex].gist_id);
                                      if (response.status == 204) {
                                        setRefresh(!refresh);
                                        await showToast(Toast.Style.Success, "Delete Gist Success");
                                      } else {
                                        await showToast(Toast.Style.Failure, "Delete Gist Failure");
                                      }
                                    }}
                                  />
                                </>
                              );
                            }
                            case GITHUB_GISTS.ALL_GISTS: {
                              return (
                                <Action
                                  title={"Star Gist"}
                                  icon={Icon.Star}
                                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                                  onAction={async () => {
                                    const response = await starGist(gistArray[gistIndex].gist_id);
                                    if (response.status == 204) {
                                      await showToast(Toast.Style.Success, "Star Gist Success");
                                    } else {
                                      await showToast(Toast.Style.Failure, "Star Gist Failure");
                                    }
                                  }}
                                />
                              );
                            }
                            case GITHUB_GISTS.STARRED: {
                              return (
                                <Action
                                  title={"Unstar Gist"}
                                  icon={Icon.Circle}
                                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                                  onAction={async () => {
                                    const response = await unStarGist(gistArray[gistIndex].gist_id);
                                    if (response.status == 204) {
                                      setRefresh(!refresh);
                                      await showToast(Toast.Style.Success, "Unstar Gist Success");
                                    } else {
                                      await showToast(Toast.Style.Failure, "Unstar Gist Failure");
                                    }
                                  }}
                                />
                              );
                            }
                            default:
                              break;
                          }
                        })()}

                        <Action
                          title={"Clone Gist"}
                          icon={Icon.Download}
                          shortcut={{ modifiers: ["cmd"], key: "g" }}
                          onAction={async () => {
                            await open("x-github-client://openRepo/" + gistArray[gistIndex].html_url);
                            await showHUD("Clone Gist");
                          }}
                        />
                      </ActionPanel.Section>
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
