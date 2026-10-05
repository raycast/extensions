import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  environment,
  getPreferenceValues,
  launchCommand,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { runAppleScript, showFailureToast, usePromise } from "@raycast/utils";
import { BLOG_URL, Entry, fetchPosts, getUnseenPosts, markSeen, takeUnnotified } from "./feed";

const RECENT_LIMIT = 5;

function escapeAppleScript(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function notify(posts: Entry[]) {
  const title =
    posts.length === 1 ? "New post on The Insight Journal" : `${posts.length} new posts on The Insight Journal`;
  const message = posts.length === 1 ? posts[0].title : posts.map((post) => post.title).join(", ");
  await runAppleScript(`display notification "${escapeAppleScript(message)}" with title "${escapeAppleScript(title)}"`);
}

async function load() {
  const posts = await fetchPosts();
  const unseen = await getUnseenPosts(posts);

  // Record every unseen post as notified, but only raise a notification during background
  // refreshes, so posts the user already saw in the open menu do not notify later.
  const fresh = await takeUnnotified(unseen);
  const { systemNotifications } = getPreferenceValues<Preferences.NewPosts>();
  if (fresh.length > 0 && systemNotifications && environment.launchType === LaunchType.Background) {
    await notify(fresh).catch(() => undefined);
  }

  return { posts, unseen };
}

export default function Command() {
  const { hideWhenEmpty } = getPreferenceValues<Preferences.NewPosts>();
  const { data, isLoading, mutate } = usePromise(load, [], {
    onError: (error) => {
      if (environment.launchType === LaunchType.UserInitiated) {
        showFailureToast(error, { title: "Could not check for new posts" });
      }
    },
  });

  const posts = data?.posts ?? [];
  const unseen = data?.unseen ?? [];
  const unseenIds = new Set(unseen.map((post) => post.id));
  const recent = posts.filter((post) => !unseenIds.has(post.id)).slice(0, RECENT_LIMIT);

  if (hideWhenEmpty && !isLoading && unseen.length === 0) {
    return null;
  }

  async function markRead(ids: string[]) {
    await mutate(markSeen(ids), {
      optimisticUpdate: (current) => ({
        posts: current?.posts ?? [],
        unseen: (current?.unseen ?? []).filter((post) => !ids.includes(post.id)),
      }),
      shouldRevalidateAfter: false,
    });
  }

  async function openPost(post: Entry) {
    await open(post.url);
    await markRead([post.id]);
  }

  return (
    <MenuBarExtra
      icon={{ source: "menu-bar-icon.png", tintColor: Color.PrimaryText }}
      title={unseen.length > 0 ? String(unseen.length) : undefined}
      tooltip={unseen.length > 0 ? `${unseen.length} new blog post(s)` : "The Insight Journal"}
      isLoading={isLoading}
    >
      {unseen.length > 0 && (
        <MenuBarExtra.Section title="New Posts">
          {unseen.map((post) => (
            <MenuBarExtra.Item
              key={post.id}
              icon={Icon.Dot}
              title={post.title}
              subtitle={post.categories[0]}
              tooltip={post.summary}
              onAction={() => openPost(post)}
            />
          ))}
          <MenuBarExtra.Item
            title="Mark All as Read"
            icon={Icon.CheckCircle}
            onAction={() => markRead(unseen.map((post) => post.id))}
          />
        </MenuBarExtra.Section>
      )}
      {recent.length > 0 && (
        <MenuBarExtra.Section title={unseen.length > 0 ? "Recent Posts" : "No New Posts · Recent"}>
          {recent.map((post) => (
            <MenuBarExtra.Item
              key={post.id}
              icon={Icon.Document}
              title={post.title}
              tooltip={post.summary}
              onAction={() => openPost(post)}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Search All Posts"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={() => launchCommand({ name: "search-posts", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Open Blog" icon={Icon.Globe} onAction={() => open(BLOG_URL)} />
        <MenuBarExtra.Item title="Configure Notifications" icon={Icon.Gear} onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
