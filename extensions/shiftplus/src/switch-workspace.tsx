import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ProfileEntry,
  readIndex,
  triggerExport,
  watchIndex,
} from "./lib/index";

const SF_ICON_MAP: Record<string, Icon> = {
  "briefcase.fill": Icon.AppWindow,
  briefcase: Icon.AppWindow,
  "house.fill": Icon.House,
  house: Icon.House,
  "star.fill": Icon.Star,
  star: Icon.Star,
  "person.fill": Icon.Person,
  person: Icon.Person,
  globe: Icon.Globe,
  laptopcomputer: Icon.Desktop,
  desktopcomputer: Icon.Desktop,
  "folder.fill": Icon.Folder,
  folder: Icon.Folder,
  "gamecontroller.fill": Icon.AppWindow,
  "heart.fill": Icon.Heart,
  heart: Icon.Heart,
  "bolt.fill": Icon.Bolt,
  bolt: Icon.Bolt,
  "wand.and.stars": Icon.Wand,
  "paintbrush.fill": Icon.Brush,
  "music.note": Icon.Music,
};

function sfSymbolToIcon(name: string): Icon {
  return SF_ICON_MAP[name] ?? Icon.AppWindow;
}

function ProfileListItem({
  profile,
  onActivate,
}: {
  profile: ProfileEntry;
  onActivate: () => void;
}) {
  const color = profile.color as Color.Raw;

  return (
    <List.Item
      key={profile.id}
      title={profile.name}
      subtitle={`${profile.appCount} app${profile.appCount !== 1 ? "s" : ""}`}
      icon={{
        source: sfSymbolToIcon(profile.icon),
        tintColor: Color.PrimaryText,
      }}
      accessories={[
        {
          tag: {
            value: profile.browserType.replace(
              "No Browser Selected",
              "No browser",
            ),
            color: Color.SecondaryText,
          },
        },
        { tag: { value: "●", color: color } },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Activate Workspace"
              icon={Icon.Play}
              onAction={onActivate}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                await triggerExport();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function SwitchWorkspace() {
  const [profiles, setProfiles] = useState<ProfileEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const watcherRef = useRef<ReturnType<typeof watchIndex>>(null);

  const reload = useCallback(async () => {
    const index = await readIndex();
    setProfiles(index?.profiles ?? null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();

    watcherRef.current = watchIndex(() => {
      reload();
    });

    return () => {
      watcherRef.current?.close();
    };
  }, [reload]);

  if (!isLoading && profiles === null) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={Icon.AppWindow}
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
    <List isLoading={isLoading} searchBarPlaceholder="Filter workspaces…">
      {profiles?.map((profile) => (
        <ProfileListItem
          key={profile.id}
          profile={profile}
          onActivate={async () => {
            try {
              await open(`shiftplus://activate?id=${profile.id}`);
              await showToast({
                style: Toast.Style.Success,
                title: `Switched to ${profile.name}`,
              });
            } catch {
              await showToast({
                style: Toast.Style.Failure,
                title: "Failed to activate workspace",
              });
            }
          }}
        />
      ))}
      {profiles !== null && profiles.length === 0 && (
        <List.EmptyView
          icon={Icon.AppWindow}
          title="No workspaces yet"
          description="Create a workspace in ShiftPlus to get started."
        />
      )}
    </List>
  );
}
