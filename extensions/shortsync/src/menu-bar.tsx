import {
  Clipboard,
  Color,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { APP_LINKS, isAuthError, listConnections, listFailedPosts, listScheduledPosts } from "./lib/api";
import { describeError } from "./lib/errors";
import { formatMenuBarTime, formatWhen, postText, truncate } from "./lib/format";
import { platformIcon, platformName } from "./lib/platforms";

const UPCOMING_COUNT = 5;

async function loadMenuBar() {
  const [scheduled, failed, connections] = await Promise.all([
    listScheduledPosts(UPCOMING_COUNT),
    listFailedPosts(100),
    listConnections(),
  ]);
  return {
    upcoming: scheduled.data,
    failedCount: failed.data.length,
    failedMore: !!failed.pagination?.next_cursor,
    names: Object.fromEntries(connections.map((c) => [c.id, c.display_name ?? ""])) as Record<string, string>,
  };
}

export default function MenuBar() {
  const { data, isLoading, error } = useCachedPromise(loadMenuBar, [], { keepPreviousData: true });

  const next = data?.upcoming[0];
  const failedCount = data?.failedCount ?? 0;
  const failedLabel = `${failedCount}${data?.failedMore ? "+" : ""}`;

  const title = next?.scheduled_for ? formatMenuBarTime(next.scheduled_for) : undefined;
  const icon =
    failedCount > 0
      ? { source: Icon.ExclamationMark, tintColor: Color.Red }
      : { source: "menu-bar-icon.png", tintColor: Color.PrimaryText };
  const tooltip = next?.scheduled_for
    ? `Next ShortSync post: ${formatWhen(next.scheduled_for)}`
    : error
      ? describeError(error).title
      : "ShortSync";

  return (
    <MenuBarExtra icon={icon} title={title} tooltip={tooltip} isLoading={isLoading}>
      {error && !data ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={describeError(error).title} icon={Icon.Warning} />
          {isAuthError(error) ? (
            <>
              <MenuBarExtra.Item title="Add Your API Key" icon={Icon.Key} onAction={openExtensionPreferences} />
              <MenuBarExtra.Item
                title="Get an API Key"
                icon={Icon.Globe}
                onAction={() => open(APP_LINKS.apiSettings())}
              />
            </>
          ) : null}
        </MenuBarExtra.Section>
      ) : null}

      {data ? (
        <MenuBarExtra.Section title={data.upcoming.length > 0 ? "Next Scheduled Posts" : "Nothing Scheduled"}>
          {data.upcoming.map((post) => {
            const text = postText(post);
            const account = data.names[post.connection_id];
            return (
              <MenuBarExtra.Item
                key={post.id}
                icon={platformIcon(post.platform)}
                title={text ? truncate(text, 40) : "No caption"}
                subtitle={formatWhen(post.scheduled_for)}
                tooltip={account ? `${platformName(post.platform)}: ${account}` : platformName(post.platform)}
                onAction={() => open(APP_LINKS.scheduled())}
                alternate={
                  text ? (
                    <MenuBarExtra.Item
                      icon={Icon.CopyClipboard}
                      title={`Copy Caption: ${truncate(text, 30)}`}
                      onAction={() => Clipboard.copy(text)}
                    />
                  ) : undefined
                }
              />
            );
          })}
        </MenuBarExtra.Section>
      ) : null}

      {data && failedCount > 0 ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title={`${failedLabel} Failed ${failedCount === 1 ? "Post" : "Posts"}`}
            onAction={() => launchCommand({ name: "scheduled-posts", type: LaunchType.UserInitiated })}
          />
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Create Post"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => launchCommand({ name: "create-post", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Scheduled Posts"
          icon={Icon.Calendar}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={() => launchCommand({ name: "scheduled-posts", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Open ShortSync"
          icon={Icon.Globe}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => open(APP_LINKS.dashboard())}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
