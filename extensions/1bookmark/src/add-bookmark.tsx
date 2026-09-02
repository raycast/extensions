import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionPanel,
  Action,
  Form,
  popToRoot,
  useNavigation,
  Toast,
  showToast,
  Icon,
  showHUD,
  getFrontmostApplication,
  Keyboard,
} from "@raycast/api";
import { runAppleScript, useCachedState } from "@raycast/utils";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "./utils/trpc.util";
import { resolveSpaceIconUrl } from "./utils/space-icon.util";
import { CachedQueryClientProvider } from "./components/CachedQueryClientProvider";
import MyAccount from "./views/MyAccount";
import { LoginFormInView } from "./components/LoginFormInView";
import { NewTagForm } from "./views/NewTagForm";
import { useLoggedOutStatus } from "./hooks/use-logged-out-status.hook";
import { useUserCacheReset } from "./hooks/use-user-cache-reset.hook";
import { useMe } from "./hooks/use-me.hook";
import { useMyTags } from "./hooks/use-tags.hook";
import { CACHED_KEY_RECENT_SELECTED_TAGS, CACHED_KEY_RECENT_SELECTED_SPACE } from "./utils/constants.util";
import { useEnabledSpaces } from "./hooks/use-enabled-spaces.hook";
import { fetchPageTitle } from "./utils/page-title.util";

interface ScriptsPerBrowser {
  getURL: () => Promise<string>;
  getTitle: () => Promise<string>;

  // Set current page url.
  setUrl: (url: string) => Promise<void>;
}

type Browser = "chrome" | "safari" | "arc";

const actions: Record<Browser, ScriptsPerBrowser> = {
  chrome: {
    async getURL() {
      const result = await runAppleScript(`
        tell application "Google Chrome"
          get URL of active tab of first window
        end tell
      `);
      return result;
    },
    async getTitle() {
      const result = await runAppleScript(`
        tell application "Google Chrome"
          get title of active tab of first window
        end tell
      `);
      return result;
    },
    async setUrl(url: string) {
      await runAppleScript(`
        tell application "Google Chrome"
          set URL of active tab of window 1 to "${url}"
        end tell
      `);
    },
  },

  safari: {
    async getURL() {
      const result = await runAppleScript(`
        tell application "Safari" to get URL of front document
      `);
      return result;
    },
    async getTitle() {
      const result = await runAppleScript(`
        tell application "Safari"
          get title of active tab of first window
        end tell
      `);
      return result;
    },
    async setUrl(url: string) {
      await runAppleScript(`
        tell application "Safari"
          set URL of current tab of front window to "${url}"
        end tell
      `);
    },
  },

  arc: {
    async getURL() {
      const result = await runAppleScript(`
        tell application "Arc"
          get URL of active tab of first window
        end tell
      `);
      return result;
    },
    async getTitle() {
      const result = await runAppleScript(`
        tell application "Arc"
          get title of active tab of first window
        end tell
      `);
      return result;
    },
    async setUrl(url: string) {
      await runAppleScript(`
        tell application "Arc"
          set URL of active tab of front window to "${url}"
        end tell
      `);
    },
  },
};

const actionsByBrowserName: { [key: string]: ScriptsPerBrowser } = {
  "Google Chrome": actions.chrome,
  Safari: actions.safari,
  Arc: actions.arc,
};

async function getCurrentBrowserPageInfo() {
  try {
    const frontmostApp = await getFrontmostApplication();
    const action = actionsByBrowserName[frontmostApp.name] || null;

    if (!action) {
      return;
    }

    const currentBrowserUrl = await action.getURL();
    const currentBrowserTitle = await action.getTitle();

    return {
      browser: action !== null ? frontmostApp.name : null,
      title: currentBrowserTitle,
      url: currentBrowserUrl,
    };
  } catch (e) {
    return undefined;
  }
}

interface SelectedTag {
  name: string;
  spaceId: string;
}

function Body(props: { onlyPop?: boolean }) {
  const { onlyPop = false } = props;
  const { pop } = useNavigation();
  // Two title sources: the auto-detected "Page title" (browser prefill or URL fetch result) vs
  // the user-entered "Custom title". A dropdown selects which one to use.
  const [userTitle, setUserTitle] = useState<string>("");
  const [browserTitle, setBrowserTitle] = useState<string>("");
  // Defaults to "Page title" so the title is filled automatically from the URL/browser prefill.
  // If the fetch fails and there is no browser prefill, a useEffect switches to "Custom title" automatically.
  const [titleSource, setTitleSource] = useState<"auto" | "manual">("auto");
  const [url, setUrl] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  // Trigger that fires the fetchPageTitle request on URL blur. Since this value is the
  // queryKey itself, even if the URL changes twice in quick succession react-query only
  // surfaces the result for the latest key, which naturally prevents stale-result races (issue #300).
  const [titleFetchUrl, setTitleFetchUrl] = useState<string>("");
  // Holds the latest value for checking whether the user has typed a title manually.
  const userTitleRef = useRef(userTitle);
  userTitleRef.current = userTitle;
  const [selectedSpace, setSelectedSpace] = useCachedState(CACHED_KEY_RECENT_SELECTED_SPACE, "");
  const [selectedTags, setSelectedTags] = useCachedState<SelectedTag[]>(CACHED_KEY_RECENT_SELECTED_TAGS, []);

  const isSlackHuddleUrl = useMemo(() => {
    // ex: https://app.slack.com/huddle/T07LSULVCQY/C07L45LKYHY
    return !!url.match(/^https:\/\/app\.slack\.com\/huddle\/.*\/C.*$/);
  }, [url]);

  useEffect(() => {
    getCurrentBrowserPageInfo().then((info) => {
      if (!info) return;
      setBrowserTitle(info.title);
      setUrl(info.url);
    });
  }, []);

  const tags = useMyTags();
  const { enabledSpaces } = useEnabledSpaces();
  // Exclude READ-only spaces from bookmark creation targets
  const writableSpaces = useMemo(() => enabledSpaces?.filter((s) => s.myRole !== "READ"), [enabledSpaces]);

  const spaceTags = useMemo(() => {
    if (!tags.data) return undefined;

    return tags.data.filter((tag) => tag.spaceId === selectedSpace);
  }, [tags.data, selectedSpace]);

  const bookmarkCreate = trpc.bookmark.create.useMutation();

  const titleQuery = useQuery({
    queryKey: ["pageTitle", titleFetchUrl],
    queryFn: () => fetchPageTitle(titleFetchUrl),
    enabled: !!titleFetchUrl,
    staleTime: Infinity,
    retry: false,
  });
  const fetchedTitle = titleQuery.data ?? null;
  const isFetchingTitle = titleQuery.isFetching;
  // Auto-detected page title: the freshly fetched one from the URL takes priority, otherwise the browser prefill.
  const autoTitle = fetchedTitle ?? browserTitle;

  // Once an auto title is available and the user hasn't typed anything, switch to "Page title" automatically.
  useEffect(() => {
    if (!autoTitle) return;
    if (userTitleRef.current.trim().length > 0) return;
    setTitleSource("auto");
  }, [autoTitle]);

  // If the fetch has finished with no result (null) or an error, and there is no browser prefill,
  // switch to "Custom title" mode automatically so the user can start typing right away.
  useEffect(() => {
    if (!titleFetchUrl) return;
    if (titleQuery.isFetching) return;
    if ((titleQuery.isError || titleQuery.data === null) && !autoTitle) {
      setTitleSource("manual");
    }
  }, [titleFetchUrl, titleQuery.isFetching, titleQuery.isError, titleQuery.data, autoTitle]);

  // Fetch the page title automatically 500ms after the user stops typing the URL (debounce).
  // Previously this fetched on blur, but it was changed so it also works when the user only
  // enters a URL without moving to another field.
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      // If the URL is cleared, the cached page title is meaningless too → reset to the initial state.
      if (titleFetchUrl) setTitleFetchUrl("");
      return;
    }
    if (trimmed === titleFetchUrl) return;
    try {
      new URL(trimmed);
    } catch {
      return;
    }
    const handle = setTimeout(() => {
      setTitleFetchUrl(trimmed);
    }, 500);
    return () => clearTimeout(handle);
  }, [url, titleFetchUrl]);

  const handleUserTitleChange = (value: string) => {
    setUserTitle(value);
    // Switch to "Custom title" automatically as soon as the user starts typing.
    setTitleSource("manual");
  };

  const effectiveTitle = titleSource === "auto" ? autoTitle : userTitle;

  // Text to show in the "Page title" field.
  const autoTitleDisplay = isFetchingTitle
    ? "Loading title from URL…"
    : autoTitle || (titleFetchUrl ? "(Couldn't get page title. Please enter manually.)" : "(Enter a URL first)");

  const handleSubmit = () => {
    // The Form's error prop only shows a message and doesn't block submit itself, so guard manually.
    if (!effectiveTitle.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Title required",
        message:
          titleSource === "manual"
            ? "Please enter a title."
            : "Page title not available. Switch to Custom title or enter a URL.",
      });
      return;
    }
    if (!url.trim() || !selectedSpace) return;
    bookmarkCreate.mutate(
      {
        name: effectiveTitle,
        description: description,
        url: url,
        spaceId: selectedSpace,
        tags: selectedTags.map((tag) => tag.name),
      },
      {
        onSuccess: () => {
          if (onlyPop) {
            showToast({
              style: Toast.Style.Success,
              title: "Bookmark added",
              message: "Bookmark added successfully",
            });
            pop();
          } else {
            showHUD("Bookmark added");
            popToRoot({ clearSearchBar: true });
          }
        },
      },
    );
  };

  const { loggedOutStatus } = useLoggedOutStatus();
  const me = useMe();
  useUserCacheReset(me.data?.email);

  if (loggedOutStatus) {
    return <LoginFormInView />;
  }

  if (!writableSpaces) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
          <Action.Push title="My Account" icon={Icon.Person} target={<MyAccount />} />
          <Action.Push
            title="Create New Tag"
            icon={Icon.Tag}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<NewTagForm spaceId={selectedSpace} />}
            onPop={() => {
              tags.refetch();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" value={url} onChange={setUrl} />
      <Form.Dropdown
        id="titleSource"
        title="Use as title"
        value={titleSource}
        onChange={(v) => setTitleSource(v as "auto" | "manual")}
      >
        <Form.Dropdown.Item value="auto" title="Page title" />
        <Form.Dropdown.Item value="manual" title="Custom title" />
      </Form.Dropdown>
      <Form.Description title="Page title" text={autoTitleDisplay} />
      {titleSource === "manual" && (
        <Form.TextField
          id="userTitle"
          title="Custom title"
          value={userTitle}
          onChange={handleUserTitleChange}
          error={userTitle.trim() === "" ? "Please enter a title." : undefined}
        />
      )}
      {isSlackHuddleUrl && (
        <Form.Checkbox
          id="answer"
          label="Check to convert slack:// schema to open with Slack app."
          onChange={() => {
            // https://api.slack.com/reference/deep-linking#slack_apps
            // slack://channel?team={TEAM_ID}&id={CHANNEL_ID}
            setUrl(`slack://channel?team=${url.split("/")[4]}&id=${url.split("/")[5]}`);
          }}
        />
      )}

      <Form.Dropdown
        id="space"
        title="Space"
        defaultValue={selectedSpace}
        isLoading={!writableSpaces}
        onChange={(value) => {
          setSelectedSpace(value);
        }}
      >
        {writableSpaces.map((s) => (
          <Form.Dropdown.Item
            key={s.id}
            value={s.id}
            title={s.name}
            icon={resolveSpaceIconUrl(s.image) || Icon.TwoPeople}
          />
        ))}
      </Form.Dropdown>

      <Form.TagPicker
        id="tag"
        title="Tags"
        value={selectedTags.map((tag) => tag.name)}
        onChange={(values) => {
          if (!tags) return;

          const selected = values.map((v) => ({ name: v, spaceId: selectedSpace }));
          setSelectedTags(selected);
        }}
      >
        {spaceTags?.map((tag) => <Form.TagPicker.Item key={tag.name} value={tag.name} title={tag.name} />)}
      </Form.TagPicker>
      <Form.Description text={`➕ You can create a new tag by '⌘ + n'`} />

      <Form.TextArea id="description" title="Description" value={description} onChange={setDescription} />
    </Form>
  );
}

export default function AddBookmark(props: { onlyPop?: boolean; launchContext?: { token?: string } }) {
  const { onlyPop = false } = props;
  return (
    <CachedQueryClientProvider launchContext={props.launchContext}>
      <Body onlyPop={onlyPop} />
    </CachedQueryClientProvider>
  );
}
