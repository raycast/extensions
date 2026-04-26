import { useState, useEffect } from "react"
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  getPreferenceValues,
  closeMainWindow,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Form,
  useNavigation,
  Keyboard,
} from "@raycast/api"
import { showFailureToast } from "@raycast/utils"
import { join } from "path"
import { loadSessions, deleteSession, slugify, CHATS_DIR } from "./lib/sessions"
import { openSession } from "./lib/terminal"
import type { Session } from "./types"

type Filter = "all" | "chat" | "code"

const NewChatForm = ({ onOpen }: { onOpen: (dir: string) => void }) => {
  const { pop } = useNavigation()
  const [name, setName] = useState("")

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Chat"
            onSubmit={() => {
              const trimmed = name.trim()
              if (!trimmed) {
                pop()
                return
              }
              onOpen(join(CHATS_DIR, slugify(trimmed)))
              pop()
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Chat Name"
        placeholder="my-chat"
        value={name}
        onChange={setName}
        autoFocus
      />
    </Form>
  )
}

const BrowseSessions = () => {
  const { terminalApp } = getPreferenceValues<Preferences.BrowseSessions>()
  const { push } = useNavigation()
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [filter, setFilter] = useState<Filter>("all")

  const reload = () => {
    setSessions(null)
    loadSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
  }

  useEffect(() => {
    loadSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
  }, [])

  const open = async (dir: string, isNew: boolean) => {
    await closeMainWindow()
    try {
      openSession(dir, isNew, terminalApp)
    } catch (err) {
      await showFailureToast(err, { title: "Failed to open session" })
    }
  }

  const remove = async (session: Session) => {
    const confirmed = await confirmAlert({
      title: `Remove "${session.label}"?`,
      message: "This will trash the session history and cannot be undone.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    })
    if (!confirmed) return
    try {
      await deleteSession(session)
      setSessions((prev) => prev?.filter((s) => s.dir !== session.dir) ?? null)
      await showToast({ style: Toast.Style.Success, title: "Session removed" })
    } catch (err) {
      await showFailureToast(err, { title: "Failed to remove session" })
    }
  }

  const chat = sessions?.filter((s) => s.type === "chat") ?? []
  const code = sessions?.filter((s) => s.type === "code") ?? []
  const visibleChat = filter === "code" ? [] : chat
  const visibleCode = filter === "chat" ? [] : code

  const sessionActions = (session: Session) => (
    <ActionPanel>
      <Action
        title="Open Session"
        icon={Icon.Terminal}
        onAction={() => open(session.dir, !session.claudeProjectDir)}
      />
      <Action
        title="New Chat"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        onAction={() => push(<NewChatForm onOpen={(dir) => open(dir, true)} />)}
      />
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Path"
          content={session.dir}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action.ShowInFinder
          title="Show in Finder"
          path={session.dir}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Session"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={() => remove(session)}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={reload}
        />
      </ActionPanel.Section>
    </ActionPanel>
  )

  const emptyActions = (
    <ActionPanel>
      <Action
        title="New Chat"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        onAction={() => push(<NewChatForm onOpen={(dir) => open(dir, true)} />)}
      />
    </ActionPanel>
  )

  return (
    <List
      isLoading={sessions === null}
      searchBarPlaceholder="Search sessions…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by type"
          onChange={(v) => setFilter(v as Filter)}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Chat" value="chat" />
          <List.Dropdown.Item title="Code" value="code" />
        </List.Dropdown>
      }
    >
      {sessions !== null &&
      visibleChat.length === 0 &&
      visibleCode.length === 0 ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No sessions found"
          description="Claude Code has not been used yet, or no sessions match the current filter."
          actions={emptyActions}
        />
      ) : (
        <>
          {visibleChat.length > 0 && (
            <List.Section title="Chat" subtitle={`${visibleChat.length}`}>
              {visibleChat.map((session) => (
                <List.Item
                  key={session.dir}
                  icon={{ source: Icon.Message, tintColor: Color.Purple }}
                  title={session.label}
                  subtitle={session.path}
                  keywords={[session.label, session.path]}
                  accessories={[
                    {
                      text: session.ago,
                      tooltip: session.mtime
                        ? new Date(session.mtime * 1000).toLocaleString()
                        : undefined,
                    },
                  ]}
                  actions={sessionActions(session)}
                />
              ))}
            </List.Section>
          )}
          {visibleCode.length > 0 && (
            <List.Section title="Code" subtitle={`${visibleCode.length}`}>
              {visibleCode.map((session) => (
                <List.Item
                  key={session.dir}
                  icon={{ source: Icon.Code, tintColor: Color.Green }}
                  title={session.label}
                  subtitle={session.path}
                  keywords={[session.label, session.path]}
                  accessories={[
                    {
                      text: session.ago,
                      tooltip: new Date(session.mtime * 1000).toLocaleString(),
                    },
                  ]}
                  actions={sessionActions(session)}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  )
}

export default BrowseSessions
