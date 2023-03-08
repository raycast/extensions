import { Action, ActionPanel, Clipboard, Icon, open, showHUD, showToast, Toast } from "@raycast/api";
import { preference, raySo } from "../util/utils";
import { deleteGist, Gist, GITHUB_GISTS, starGist, unStarGist } from "../util/gist-utils";
import CreateGist from "../create-gist";
import { Dispatch, SetStateAction } from "react";
import { alertDialog, refreshNumber } from "../hooks/hooks";

export function GistAction(props: {
  gistArray: Gist[];
  gistIndex: number;
  gistFileName: string;
  gistFileContent: string;
  route: string;
  setRefresh: Dispatch<SetStateAction<number>>;
}) {
  const { gistArray, gistIndex, gistFileName, gistFileContent, route, setRefresh } = props;
  return (
    <>
      <Action
        title={preference.primaryAction === "copy" ? "Copy to Clipboard" : "Paste to Active App"}
        icon={preference.primaryAction === "copy" ? Icon.Clipboard : Icon.Window}
        onAction={async () => {
          if (preference.primaryAction === "copy") {
            await Clipboard.copy(gistFileContent);
            await showToast(Toast.Style.Success, "Copy gist to clipboard!");
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
            await showToast(Toast.Style.Success, "Copy gist to clipboard!");
          }
        }}
      />

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title={"Copy Gist Link"}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          content={gistArray[gistIndex].html_url}
        />
        <Action.OpenInBrowser
          title={"Open in Browser"}
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          url={gistArray[gistIndex].html_url}
        />
        <Action.OpenInBrowser
          title={"Open in Ray.so"}
          icon={{ source: { light: "raycast.png", dark: "raycast@dark.png" } }}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          url={raySo(gistFileName, Buffer.from(gistFileContent, "utf-8").toString("base64"))}
        />
      </ActionPanel.Section>

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
                        await showToast(Toast.Style.Success, "Star gist success!");
                      } else {
                        await showToast(Toast.Style.Failure, "Star gist failure.");
                      }
                    }}
                  />
                  <Action.Push
                    title={"Create Gist"}
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={<CreateGist gist={undefined} setRefresh={setRefresh} />}
                  />
                  <Action.Push
                    title={"Edit Gist"}
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<CreateGist gist={gistArray[gistIndex]} setRefresh={setRefresh} />}
                  />
                  <Action
                    title={"Delete Gist"}
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      await alertDialog(
                        Icon.Trash,
                        "Delete Gist",
                        "Are you sure you want to delete this gist?",
                        "Delete",
                        async () => {
                          const response = await deleteGist(gistArray[gistIndex].gist_id);
                          if (response.status == 204) {
                            setRefresh(refreshNumber);
                            await showToast(Toast.Style.Success, "Delete gist success!");
                          } else {
                            await showToast(Toast.Style.Failure, "Delete gist failure.");
                          }
                        }
                      );
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
                      await showToast(Toast.Style.Success, "Star gist success!");
                    } else {
                      await showToast(Toast.Style.Failure, "Star gist failure.");
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
                      setRefresh(refreshNumber);
                      await showToast(Toast.Style.Success, "Unstar gist success!");
                    } else {
                      await showToast(Toast.Style.Failure, "Unstar gist failure.");
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
    </>
  );
}
