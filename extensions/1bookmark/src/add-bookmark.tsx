import { useEffect, useMemo, useState } from "react";
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
  Cache,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useAtom } from "jotai";
import { trpc } from "./utils/trpc.util";
import { CachedQueryClientProvider } from "./components/CachedQueryClientProvider";
import MyAccount from "./views/MyAccount";
import { sessionTokenAtom } from "./states/session-token.state";
import { recentSelectedSpaceAtom, recentSelectedTagsAtom } from "./states/recent-selected.state";
import { LoginView } from "./views/LoginView";
import { NewTagForm } from "./views/NewTagForm";
import { useMe } from "./hooks/use-me.hook";

const cache = new Cache();

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

function Body(props: { onlyPop?: boolean }) {
  const { onlyPop = false } = props;
  const { pop } = useNavigation();
  const [title, setTitle] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [sessionToken] = useAtom(sessionTokenAtom);
  const [selectedSpace, setSelectedSpace] = useAtom(recentSelectedSpaceAtom);
  const [selectedTags, setSelectedTags] = useAtom(recentSelectedTagsAtom);

  const isSlackHuddleUrl = useMemo(() => {
    // ex: https://app.slack.com/huddle/T07LSULVCQY/C07L45LKYHY
    return !!url.match(/^https:\/\/app\.slack\.com\/huddle\/.*\/C.*$/);
  }, [url]);

  useEffect(() => {
    getCurrentBrowserPageInfo().then((info) => {
      setTitle(info ? info.title : "");
      setUrl(info ? info.url : "");
    });
  }, []);

  const me = useMe(sessionToken);

  const spaceIds = useMemo(() => {
    return me?.data?.associatedSpaces.map((s) => s.id) || [];
  }, [me.data]);

  const tags = trpc.tag.list.useQuery({ spaceIds });
  const spaceTags = useMemo(() => {
    if (!tags.data) return undefined;

    return tags.data.filter((tag) => tag.spaceId === selectedSpace);
  }, [tags.data, selectedSpace]);

  const bookmarkCreate = trpc.bookmark.create.useMutation();

  const handleSubmit = async () => {
    await bookmarkCreate.mutateAsync({
      name: title,
      description: description,
      url: url,
      spaceId: selectedSpace,
      tags: selectedTags.map((tag) => tag.name),
    });

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
  };

  const [after1Sec, setAfter1Sec] = useState(false);
  useEffect(() => {
    // If this is not here, will briefly appear.
    setTimeout(() => setAfter1Sec(true), 1000);
  }, []);

  const loggedOutStatus = !sessionToken && after1Sec;
  useEffect(() => {
    // Clear data when logged out.
    if (loggedOutStatus) {
      cache.remove("me");
      cache.remove("bookmarks");
    }
  }, [loggedOutStatus]);

  if (loggedOutStatus) {
    return <LoginView />;
  }

  if (!me.data) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
          <Action.Push
            title="My Account"
            icon={Icon.Person}
            target={<MyAccount />}
            onPush={() => {
              setAfter1Sec(false);
            }}
            onPop={() => {
              setTimeout(() => setAfter1Sec(true), 100);
            }}
          />
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
      <Form.TextField id="title" title="Title" value={title} onChange={setTitle} />
      <Form.TextField id="url" title="URL" value={url} onChange={setUrl} />
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
        isLoading={!me.data}
        onChange={(value) => {
          setSelectedSpace(value);
        }}
      >
        {me.data?.associatedSpaces.map((s) => (
          <Form.Dropdown.Item key={s.id} value={s.id} title={s.name} icon={s.image || Icon.TwoPeople} />
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

export default function AddBookmark(props: { onlyPop?: boolean }) {
  const { onlyPop = false } = props;
  return (
    <CachedQueryClientProvider>
      <Body onlyPop={onlyPop} />
    </CachedQueryClientProvider>
  );
}
