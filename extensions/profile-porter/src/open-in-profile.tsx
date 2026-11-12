import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  LaunchProps,
  List,
  closeMainWindow,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { asLink, porterLink, Profile, profiles, send } from "./porter";

export default function Command(props: LaunchProps<{ arguments: { url?: string } }>) {
  const [all, setAll] = useState<Profile[]>();
  const [link, setLink] = useState<string | undefined>(asLink(props.arguments.url));

  useEffect(() => {
    profiles()
      .then(setAll)
      .catch((error) => {
        setAll([]);
        showToast({
          style: Toast.Style.Failure,
          title: "Couldn't list the profiles",
          message: String(error.message ?? error),
        });
      });
    // No link typed: the one on the clipboard, if that's what it holds.
    if (!link) Clipboard.readText().then((text) => setLink(asLink(text)));
  }, []);

  async function openIn(profile: Profile, privately: boolean) {
    if (await send(porterLink("open", { url: link, profile: profile.key, private: privately ? "1" : undefined }))) {
      await closeMainWindow();
    }
  }

  const what = link ? `Open ${link.replace(/^https?:\/\//, "")}` : "Open a Window";
  return (
    <List isLoading={all === undefined} searchBarPlaceholder={link ? `Open ${link} in…` : "Open a window of…"}>
      <List.EmptyView
        title="No browser profiles found"
        description="Open Profile Porter once, so it can find your browsers."
      />
      {(all ?? []).map((p) => (
        <List.Item
          key={p.key}
          title={p.name}
          subtitle={p.email}
          icon={{ fileIcon: p.app }}
          accessories={[{ text: p.browser }]}
          keywords={[p.browser, p.email]}
          actions={
            <ActionPanel>
              <Action title={what} icon={Icon.Globe} onAction={() => openIn(p, false)} />
              {p.browser !== "Safari" && (
                <Action
                  title={link ? "Open in a Private Window" : "Open a Private Window"}
                  icon={Icon.EyeDisabled}
                  shortcut={{ modifiers: ["shift"], key: "return" }}
                  onAction={() => openIn(p, true)}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
