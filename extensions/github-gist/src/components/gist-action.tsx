import { Action, ActionPanel, Application, Clipboard, Icon, open, showHUD, showToast, Toast } from "@raycast/api";
import { alertDialog, raySo } from "../util/utils";
import { deleteGist, Gist, GithubGistTag, starGist, unStarGist } from "../util/gist-utils";
import CreateGist from "../create-gist";
import { primaryAction } from "../types/preferences";
import { MutatePromise } from "@raycast/utils";

export function GistAction(props: {
  gist: Gist;
  gistFileName: string;
  gistFileContent: string;
  tag: GithubGistTag;
  gistMutate: MutatePromise<Gist[]>;
  fronstmostApp: Application;
}) {
  const { gist, gistFileName, gistFileContent, tag, gistMutate, fronstmostApp } = props;

  return (
    <>
      <Action
        title={primaryAction === "copy" ? "Copy to Clipboard" : "Paste to " + fronstmostApp?.name}
        icon={primaryAction === "copy" ? Icon.Clipboard : { fileIcon: fronstmostApp?.path }}
        onAction={async () => {
          if (primaryAction === "copy") {
            await Clipboard.copy(gistFileContent);
            await showHUD("📋 Copied to Clipboard");
          } else {
            await Clipboard.paste(gistFileContent);
            await showHUD("📝 Pasted to Active App");
          }
        }}
      />
      <Action
        title={primaryAction === "copy" ? "Paste to " + fronstmostApp?.name : "Copy to Clipboard"}
        icon={primaryAction === "copy" ? { fileIcon: fronstmostApp?.path } : Icon.Clipboard}
        onAction={async () => {
          if (primaryAction === "copy") {
            await Clipboard.paste(gistFileContent);
            await showHUD("📝 Pasted to Active App");
          } else {
            await Clipboard.copy(gistFileContent);
            await showHUD("📋 Copied to Clipboard");
          }
        }}
      />

      <ActionPanel.Section>
        {(() => {
          switch (tag) {
            case GithubGistTag.MY_GISTS: {
              return (
                <>
                  <Action
                    title={"Star Gist"}
                    icon={Icon.Star}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={async () => {
                      const response = await starGist(gist.gist_id);
                      if (response.status == 204) {
                        await showToast(Toast.Style.Success, "Gist Stared");
                      } else {
                        await showToast(Toast.Style.Failure, "Failed to Star Gist");
                      }
                    }}
                  />
                  <Action.Push
                    title={"Edit Gist"}
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<CreateGist gist={gist} gistMutate={gistMutate} />}
                  />
                </>
              );
            }
            case GithubGistTag.ALL_GISTS: {
              return (
                <Action
                  title={"Star Gist"}
                  icon={Icon.Star}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  onAction={async () => {
                    const response = await starGist(gist.gist_id);
                    if (response.status == 204) {
                      await showToast(Toast.Style.Success, "Gist Stared");
                    } else {
                      await showToast(Toast.Style.Failure, "Failed to Star Gist");
                    }
                  }}
                />
              );
            }
            case GithubGistTag.STARRED: {
              return (
                <Action
                  title={"Unstar Gist"}
                  icon={Icon.StarDisabled}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                  onAction={async () => {
                    const response = await unStarGist(gist.gist_id);
                    if (response.status == 204) {
                      await showToast(Toast.Style.Success, "Gist Unstared");
                      await gistMutate();
                    } else {
                      await showToast(Toast.Style.Failure, "Failed to Unstar Gist");
                    }
                  }}
                />
              );
            }
            default:
              break;
          }
        })()}
        <Action.Push
          title={"Create Gist"}
          icon={Icon.PlusTopRightSquare}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<CreateGist gist={undefined} gistMutate={gistMutate} />}
        />
        <Action
          title={"Clone Gist"}
          icon={Icon.SaveDocument}
          shortcut={{ modifiers: ["cmd"], key: "g" }}
          onAction={async () => {
            await open("x-github-client://openRepo/" + gist.html_url);
            await showHUD("Clone Gist");
          }}
        />

        {tag === GithubGistTag.MY_GISTS && (
          <Action
            title={"Delete Gist"}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              await alertDialog(
                Icon.Trash,
                "Delete Gist",
                "Are you sure you want to delete this gist?",
                "Confirm",
                async () => {
                  const response = await deleteGist(gist.gist_id);
                  if (response.status == 204) {
                    await showToast(Toast.Style.Success, "Gist Deleted");
                    await gistMutate();
                  } else {
                    await showToast(Toast.Style.Failure, "Failed to Delete Gist");
                  }
                },
              );
            }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title={"Copy Gist Link"}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          content={gist.html_url}
        />
        <Action.CopyToClipboard
          title={"Copy Raw Link"}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          content={gist.file[0].raw_url}
        />
        <Action.OpenInBrowser
          title={"Open in Browser"}
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          url={gist.html_url}
        />
        <Action.CreateSnippet
          icon={Icon.Snippets}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          snippet={{ name: gistFileName, text: gistFileContent }}
        />
        <Action.OpenInBrowser
          title={"Open in Ray.so"}
          icon={{ source: { light: "raycast.png", dark: "raycast@dark.png" } }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          url={raySo(gistFileName, Buffer.from(gistFileContent, "utf-8").toString("base64"))}
        />
      </ActionPanel.Section>
    </>
  );
}
