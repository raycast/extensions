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
  // 두 개의 제목 소스: 자동 감지된 "Page title" (브라우저 프리필 또는 URL fetch 결과) vs
  // 사용자가 직접 입력한 "Custom title". 드롭다운으로 어떤 걸 사용할지 선택한다.
  const [userTitle, setUserTitle] = useState<string>("");
  const [browserTitle, setBrowserTitle] = useState<string>("");
  // 기본은 "Page title" — URL/브라우저 prefill 에서 자동으로 제목이 들어가도록.
  // fetch 실패하고 browser prefill 도 없으면 useEffect 가 자동으로 "Custom title" 로 전환.
  const [titleSource, setTitleSource] = useState<"auto" | "manual">("auto");
  const [url, setUrl] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  // URL blur 시 fetchPageTitle 요청을 띄우는 트리거. 이 값이 곧 queryKey 가
  // 되므로, URL을 빠르게 두 번 바꿔도 react-query 가 latest key 의 결과만 hook 에
  // 반영해 stale 결과 race 가 자연스럽게 막힌다 (이슈 #300).
  const [titleFetchUrl, setTitleFetchUrl] = useState<string>("");
  // 사용자가 직접 입력했는지 판단할 때 최신 값 비교용.
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
  // READ 권한 스페이스는 북마크 추가 대상에서 제외
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
  // 자동 감지된 페이지 제목: URL 에서 갓 fetch 한 것이 우선, 없으면 브라우저 프리필.
  const autoTitle = fetchedTitle ?? browserTitle;

  // 자동 제목이 채워지고 사용자가 직접 입력한 게 없으면 자동으로 "Page title" 로 전환.
  useEffect(() => {
    if (!autoTitle) return;
    if (userTitleRef.current.trim().length > 0) return;
    setTitleSource("auto");
  }, [autoTitle]);

  // fetch 가 끝났는데 결과가 없거나 (null) 에러이고 browser prefill 도 없으면
  // 자동으로 "Custom title" 모드로 전환해 사용자가 즉시 직접 입력할 수 있게 한다.
  useEffect(() => {
    if (!titleFetchUrl) return;
    if (titleQuery.isFetching) return;
    if ((titleQuery.isError || titleQuery.data === null) && !autoTitle) {
      setTitleSource("manual");
    }
  }, [titleFetchUrl, titleQuery.isFetching, titleQuery.isError, titleQuery.data, autoTitle]);

  // URL 입력이 멈춘 뒤 500ms 가 지나면 자동으로 페이지 제목을 가져온다 (debounce).
  // 이전엔 blur 시점에 fetch 했지만, 사용자가 URL 만 입력하고 다른 필드로 이동하지
  // 않아도 자동으로 동작하도록 변경.
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      // URL 이 비워지면 캐시된 페이지 제목도 의미 없음 → 초기 상태로 리셋.
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
    // 사용자가 직접 입력하기 시작하면 자동으로 "Custom title" 로 스위치.
    setTitleSource("manual");
  };

  const effectiveTitle = titleSource === "auto" ? autoTitle : userTitle;

  // "Page title" 필드에 보여줄 텍스트.
  const autoTitleDisplay = isFetchingTitle
    ? "Loading title from URL…"
    : autoTitle || (titleFetchUrl ? "(Couldn't get page title. Please enter manually.)" : "(Enter a URL first)");

  const handleSubmit = () => {
    // Form 의 error prop 은 메시지만 보여주고 submit 자체는 막지 않으므로 직접 가드.
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
