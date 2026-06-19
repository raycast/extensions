import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Image,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ProfileEntry, QuickLinkEntry, readIndex } from "./lib/index";

interface FlatLink {
  profileId: string;
  profileName: string;
  link: QuickLinkEntry;
}

function linkIcon(link: QuickLinkEntry): Image.ImageLike {
  if (link.appPath) return { fileIcon: link.appPath };
  return Icon.Link;
}

function badgeTag(link: QuickLinkEntry): string {
  if (link.badgeLabel) return link.badgeLabel;
  if (link.isPreset === false) return "Custom";
  try {
    const u = new URL(link.url);
    return u.hostname.replace(/^www\./, "") || u.protocol.replace(":", "");
  } catch {
    return "Custom";
  }
}

export default function QuickLink() {
  const [flatLinks, setFlatLinks] = useState<FlatLink[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    readIndex().then((index) => {
      if (!index) {
        setFlatLinks(null);
      } else {
        const flat: FlatLink[] = index.profiles.flatMap(
          (profile: ProfileEntry) =>
            profile.quickLinks.map((link: QuickLinkEntry) => ({
              profileId: profile.id,
              profileName: profile.name,
              link,
            })),
        );
        setFlatLinks(flat);
      }
      setIsLoading(false);
    });
  }, []);

  if (!isLoading && flatLinks === null) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={Icon.Link}
          title="ShiftPlus index not found"
          description="Open ShiftPlus and enable Raycast integration in Settings → Integrations."
          actions={
            <ActionPanel>
              <Action
                title="Open ShiftPlus"
                icon={Icon.AppWindow}
                onAction={() => open("shiftplus://")}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter quick links…">
      {flatLinks?.map((item) => (
        <List.Item
          key={`${item.profileId}-${item.link.id}`}
          title={item.link.title}
          subtitle={item.profileName}
          icon={linkIcon(item.link)}
          accessories={[{ tag: badgeTag(item.link) }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Quick Link"
                icon={Icon.Globe}
                onAction={async () => {
                  try {
                    await open(
                      `shiftplus://quick-link?profileId=${item.profileId}&linkId=${item.link.id}`,
                    );
                    await showToast({
                      style: Toast.Style.Success,
                      title: `Opened ${item.link.title}`,
                    });
                  } catch {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to open quick link",
                    });
                  }
                }}
              />
              <Action
                title="Activate Parent Profile"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={async () => {
                  try {
                    await open(`shiftplus://activate?id=${item.profileId}`);
                    await showToast({
                      style: Toast.Style.Success,
                      title: `Activated ${item.profileName}`,
                    });
                  } catch {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to activate profile",
                    });
                  }
                }}
              />
              <Action
                title="Edit in ShiftPlus"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={async () => {
                  await open(
                    `shiftplus://edit?profileId=${item.profileId}&quickLinkId=${item.link.id}`,
                  );
                }}
              />
              <Action
                title="Copy Resolved URL"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={async () => {
                  await Clipboard.copy(item.link.url);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "URL copied",
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      {flatLinks !== null && flatLinks.length === 0 && (
        <List.EmptyView
          icon={Icon.Link}
          title="No quick links yet"
          description="Add quick links to your workspaces in ShiftPlus."
        />
      )}
    </List>
  );
}
