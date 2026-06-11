import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  LocalStorage,
  Toast,
  closeMainWindow,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { checkIt2apiReadyAsync } from "./core/it2api";
import { Session, activateSession, listSessions } from "./core/it2api-runner";
import { PermissionErrorScreen, isPermissionError } from "./core/permission-error-screen";

const TAGS_STORAGE_KEY = "iterm.session-tags.v2";

interface Tab {
  windowIndex: number;
  tabId: string;
  sessions: Session[];
}

const groupByTab = (sessions: Session[]): Tab[] => {
  const tabMap = new Map<string, Tab>();
  const windowOrder: string[] = [];

  for (const session of sessions) {
    if (!windowOrder.includes(session.windowId)) windowOrder.push(session.windowId);
    const key = `${session.windowId}::${session.tabId}`;
    if (!tabMap.has(key))
      tabMap.set(key, { windowIndex: windowOrder.indexOf(session.windowId) + 1, tabId: session.tabId, sessions: [] });
    tabMap.get(key)!.sessions.push(session);
  }

  return Array.from(tabMap.values());
};

interface TagFormProps {
  session: Session;
  currentTag: string;
  onSave: (sessionId: string, tag: string) => void;
}

const TagForm = ({ session, currentTag, onSave }: TagFormProps) => {
  const { pop } = useNavigation();
  const [tag, setTag] = useState(currentTag);

  const handleSave = ({ tag: submitted }: { tag: string }) => {
    onSave(session.id, submitted.trim());
    pop();
  };

  const handleRemove = () => {
    onSave(session.id, "");
    pop();
  };

  return (
    <Form
      navigationTitle={`Tag: ${session.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Tag" icon={Icon.Tag} onSubmit={handleSave} />
          {currentTag.length > 0 && (
            <Action title="Remove Tag" icon={Icon.Trash} style={Action.Style.Destructive} onAction={handleRemove} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField id="tag" title="Tag" value={tag} onChange={setTag} placeholder="e.g. api, frontend, db…" />
    </Form>
  );
};

export default function Command() {
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [tags, setTags] = useState<Record<string, string>>({});
  const { push } = useNavigation();

  useEffect(() => {
    LocalStorage.getItem<string>(TAGS_STORAGE_KEY).then((stored) => {
      if (stored) setTags(JSON.parse(stored));
    });
  }, []);

  const [prerequisite, setPrerequisite] = useState<{ ready: boolean; reason?: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await checkIt2apiReadyAsync();
        if (mounted) setPrerequisite(res.ready ? { ready: true } : { ready: false, reason: res.reason });
      } catch (e) {
        if (mounted) setPrerequisite({ ready: false, reason: (e as Error).message });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const checking = prerequisite === null;

  const { tabs, it2apiError } = useMemo(() => {
    if (checking) return { tabs: [] as Tab[], it2apiError: undefined };
    if (!prerequisite!.ready) return { tabs: [] as Tab[], it2apiError: prerequisite!.reason };
    try {
      return { tabs: groupByTab(listSessions()), it2apiError: undefined };
    } catch (e) {
      return { tabs: [] as Tab[], it2apiError: (e as Error).message };
    }
  }, [prerequisite, checking]);

  const switchTo = async (session: Session) => {
    try {
      activateSession(session.id);
      await closeMainWindow();
    } catch (e) {
      const error = e as Error;
      if (isPermissionError(error.message)) {
        setHasPermissionError(true);
        return;
      }
      await showToast({ style: Toast.Style.Failure, title: "Cannot switch session", message: error.message });
    }
  };

  const saveTag = async (sessionId: string, tag: string) => {
    const updated = { ...tags, [sessionId]: tag };
    if (!tag) delete updated[sessionId];
    setTags(updated);
    await LocalStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(updated));
  };

  const openTagForm = (session: Session) =>
    push(<TagForm session={session} currentTag={tags[session.id] ?? ""} onSave={saveTag} />);

  const [selectedWindow, setSelectedWindow] = useState("all");

  const windowCount = useMemo(() => new Set(tabs.map((t) => t.windowIndex)).size, [tabs]);
  const visibleTabs = selectedWindow === "all" ? tabs : tabs.filter((t) => String(t.windowIndex) === selectedWindow);

  if (hasPermissionError) return <PermissionErrorScreen />;

  return (
    <List
      searchBarPlaceholder="Search sessions…"
      searchBarAccessory={
        windowCount > 1 ? (
          <List.Dropdown tooltip="Filter by window" value={selectedWindow} onChange={setSelectedWindow}>
            <List.Dropdown.Item title="All Windows" value="all" />
            {Array.from({ length: windowCount }, (_, i) => (
              <List.Dropdown.Item key={i + 1} title={`Window ${i + 1}`} value={String(i + 1)} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {checking && (
        <List.EmptyView
          icon={Icon.Clock}
          title="Checking iTerm2..."
          description="Verifying iTerm2 Python API availability"
        />
      )}
      {it2apiError && (
        <List.EmptyView icon={Icon.ExclamationMark} title="Cannot connect to iTerm2" description={it2apiError} />
      )}
      {!it2apiError && visibleTabs.length === 0 && (
        <List.EmptyView icon={Icon.Terminal} title="No sessions found" description="No open iTerm sessions detected" />
      )}
      {visibleTabs.map((tab) => (
        <List.Section
          key={`w${tab.windowIndex}-t${tab.tabId}`}
          title={windowCount > 1 ? `Window ${tab.windowIndex} · Tab ${tab.tabId}` : `Tab ${tab.tabId}`}
        >
          {tab.sessions.map((session) => {
            const tag = tags[session.id];
            return (
              <List.Item
                key={session.id}
                icon={Icon.Terminal}
                title={session.name}
                accessories={tag ? [{ tag: { value: tag, color: Color.Blue } }] : []}
                actions={
                  <ActionPanel>
                    <Action title="Switch to Session" icon={Icon.Terminal} onAction={() => switchTo(session)} />
                    <Action
                      title="Tag Session"
                      icon={Icon.Tag}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      onAction={() => openTagForm(session)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
