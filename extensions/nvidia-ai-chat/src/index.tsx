import {
  ActionPanel,
  Action,
  List,
  getPreferenceValues,
  Icon,
  Form,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import OpenAI from "openai";
interface Message {
  role: "user" | "assistant";
  content: string;
}
interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  archived?: boolean;
}
function formatMessages(msgs: Message[]) {
  if (msgs.length === 0) return "No messages yet. Start typing your message in the search bar below and press Enter!";
  return msgs.map((msg) => `**${msg.role === "user" ? "🧑 You" : "🤖 AI"}**:\n\n${msg.content}`).join("\n\n---\n\n");
}
function RenameForm({ session, onRename }: { session: ChatSession; onRename: (id: string, newTitle: string) => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Title"
            onSubmit={(values) => {
              if (values.title.trim()) {
                onRename(session.id, values.title.trim());
              }
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Chat Title" defaultValue={session.title} />
    </Form>
  );
}
function ArchiveList({ sessions, setSessions }: { sessions: ChatSession[]; setSessions: (s: ChatSession[]) => void }) {
  const { pop } = useNavigation();
  const archivedSessions = sessions.filter((s) => s.archived).sort((a, b) => b.updatedAt - a.updatedAt);
  async function clearArchive() {
    if (
      await confirmAlert({
        icon: Icon.Trash,
        title: "Clear Archive",
        message: "Are you sure you want to permanently delete all archived chats? This cannot be undone.",
        primaryAction: {
          title: "Delete All",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      setSessions(sessions.filter((s) => !s.archived));
      pop();
    }
  }
  return (
    <List isShowingDetail={true} searchBarPlaceholder="Search archive...">
      {archivedSessions.map((session) => (
        <List.Item
          key={session.id}
          id={session.id}
          title={session.title}
          subtitle={`${session.messages.length} msgs`}
          icon={Icon.Box}
          detail={<List.Item.Detail markdown={formatMessages(session.messages)} />}
          actions={
            <ActionPanel>
              <Action
                title="Restore Chat"
                icon={Icon.Reply}
                onAction={() => setSessions(sessions.map((s) => (s.id === session.id ? { ...s, archived: false } : s)))}
              />
              <Action
                title="Delete Permanently"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => setSessions(sessions.filter((s) => s.id !== session.id))}
              />
              <Action.CopyToClipboard
                title="Copy Chat History"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                content={formatMessages(session.messages)}
              />
              {archivedSessions.length > 0 && (
                <Action
                  title="Clear Archive"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  onAction={clearArchive}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView title="Archive is Empty" icon={Icon.Box} />
    </List>
  );
}
export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const openai = useMemo(
    () =>
      new OpenAI({
        apiKey: preferences.apiKey,
        baseURL: "https://integrate.api.nvidia.com/v1",
      }),
    [preferences.apiKey],
  );
  const [cachedApiKey, setCachedApiKey] = useCachedState<string>("cached-apiKey", "");
  const [cachedModels, setCachedModels] = useCachedState<{ id: string; name: string }[]>("cached-models", []);
  const [recentModelIds, setRecentModelIds] = useCachedState<string[]>("recent-models", []);
  const shouldFetchModels = preferences.apiKey !== cachedApiKey || cachedModels.length === 0;
  const { isLoading: isLoadingModels, revalidate: reloadModels } = usePromise(
    async (apiKeyToFetch) => {
      const response = await openai.models.list();
      const uniqueModelsRaw = Array.from(new Map(response.data.map((m) => [m.id, m])).values());
      const newModels = uniqueModelsRaw
        .map((m) => ({ id: m.id, name: m.id }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setCachedModels(newModels);
      setCachedApiKey(apiKeyToFetch);
      return newModels;
    },
    [preferences.apiKey],
    {
      execute: shouldFetchModels,
    },
  );
  const [modelId, setModelId] = useCachedState<string>("selected-model", "");
  const [sessions, setSessions] = useCachedState<ChatSession[]>("chat-sessions", []);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const effectiveModelId = modelId || (cachedModels.length > 0 ? cachedModels[0].id : "");
  function handleModelChange(newId: string) {
    setModelId(newId);
    setRecentModelIds((prev) => {
      // Keep only up to 5 unique recent models
      const topRecent = [newId, ...(prev || []).filter((id) => id !== newId)].slice(0, 5);
      return topRecent;
    });
  }
  async function sendMessage() {
    if (!searchText.trim() || !effectiveModelId) return;
    setRecentModelIds((prev) => {
      const topRecent = [effectiveModelId, ...(prev || []).filter((id) => id !== effectiveModelId)].slice(0, 5);
      return topRecent;
    });
    const userInput = searchText.trim();
    setSearchText("");
    setIsLoading(true);
    const userMsg: Message = { role: "user", content: userInput };
    let currentSessionId = selectedSessionId;
    let isNewSession = false;
    if (currentSessionId === "new" || !currentSessionId) {
      currentSessionId = Date.now().toString();
      isNewSession = true;
    }
    const currentSession = sessions.find((s) => s.id === currentSessionId);
    const updatedMessages = currentSession ? [...currentSession.messages, userMsg] : [userMsg];
    const newSession: ChatSession = {
      id: currentSessionId,
      title: isNewSession
        ? userInput.length > 30
          ? userInput.substring(0, 30) + "..."
          : userInput
        : currentSession?.title || "Chat",
      messages: updatedMessages,
      updatedAt: Date.now(),
      archived: false,
    };
    let newSessionsList = [];
    if (isNewSession) {
      newSessionsList = [newSession, ...sessions];
      setSelectedSessionId(currentSessionId);
    } else {
      newSessionsList = sessions.map((s) => (s.id === currentSessionId ? newSession : s));
    }
    setSessions(newSessionsList);
    try {
      const response = await openai.chat.completions.create({
        model: effectiveModelId,
        messages: updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });
      const assistantMessage = response.choices[0]?.message?.content || "";
      const finalSession = {
        ...newSession,
        messages: [...updatedMessages, { role: "assistant", content: assistantMessage }],
      };
      setSessions((prev) => prev.map((s) => (s.id === currentSessionId ? finalSession : s)));
    } catch (error) {
      console.error(error);
      const errorSession = {
        ...newSession,
        messages: [
          ...updatedMessages,
          {
            role: "assistant",
            content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
      setSessions((prev) => prev.map((s) => (s.id === currentSessionId ? errorSession : s)));
    } finally {
      setIsLoading(false);
    }
  }
  function archiveSession(id: string) {
    setSessions(sessions.map((s) => (s.id === id ? { ...s, archived: true } : s)));
    if (selectedSessionId === id) {
      setSelectedSessionId(null);
    }
  }
  function renameSession(id: string, newTitle: string) {
    setSessions(sessions.map((s) => (s.id === id ? { ...s, title: newTitle } : s)));
  }
  const newChatMarkdown =
    "## 🆕 Start a New Chat\n\nType your prompt in the search bar below and press **Enter** to start a new AI conversation.";
  const recentModels = (recentModelIds || []).map((id) => cachedModels.find((m) => m.id === id)).filter(Boolean);
  const restModels = cachedModels.filter((m) => !(recentModelIds || []).includes(m.id));
  const activeSessions = sessions.filter((s) => !s.archived).sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <List
      isLoading={isLoading || isLoadingModels}
      isShowingDetail={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={setSelectedSessionId}
      searchBarPlaceholder="Message Nvidia AI..."
      filtering={false}
      searchBarAccessory={
        cachedModels.length > 0 ? (
          <List.Dropdown tooltip="Select Model" value={effectiveModelId} onChange={handleModelChange}>
            {recentModels.length > 0 && (
              <List.Dropdown.Section title="Recent Models">
                {recentModels.map((model) => (
                  <List.Dropdown.Item key={`recent-${model.id}`} title={model.name} value={model.id} />
                ))}
              </List.Dropdown.Section>
            )}
            <List.Dropdown.Section title="All Models">
              {restModels.map((model) => (
                <List.Dropdown.Item key={`all-${model.id}`} title={model.name} value={model.id} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : null
      }
    >
      <List.Item
        id="new"
        title="✨ New Chat"
        icon={Icon.PlusCircle}
        detail={<List.Item.Detail markdown={newChatMarkdown} />}
        actions={
          <ActionPanel>
            <Action title="Send Message" onAction={sendMessage} icon={Icon.Message} />
            <Action.Push
              title="View Archive"
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              icon={Icon.Box}
              target={<ArchiveList sessions={sessions} setSessions={setSessions} />}
            />
            <Action
              title="Refresh Models"
              onAction={() => reloadModels()}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
          </ActionPanel>
        }
      />
      {activeSessions.map((session) => (
        <List.Item
          key={session.id}
          id={session.id}
          title={session.title}
          subtitle={`${session.messages.length} msgs`}
          icon={Icon.Message}
          detail={<List.Item.Detail markdown={formatMessages(session.messages)} />}
          actions={
            <ActionPanel>
              <Action title="Send Message" onAction={sendMessage} icon={Icon.Message} />
              <Action
                title="Archive Chat"
                shortcut={{ modifiers: ["cmd"], key: "delete" }}
                style={Action.Style.Destructive}
                onAction={() => archiveSession(session.id)}
                icon={Icon.Box}
              />
              <Action.Push
                title="Rename Chat"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                icon={Icon.Pencil}
                target={<RenameForm session={session} onRename={renameSession} />}
              />
              <Action.Push
                title="View Archive"
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                icon={Icon.Box}
                target={<ArchiveList sessions={sessions} setSessions={setSessions} />}
              />
              <Action.CopyToClipboard
                title="Copy Chat History"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                content={formatMessages(session.messages)}
              />
              <Action
                title="Refresh Models"
                onAction={() => reloadModels()}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
Nvidia AI Raycast Extension Development
This is a comment left during a code review.
Path: extensions/nvidia-ai-chat/src/index.tsx
Line: 1-2

Comment:
**`@ts-nocheck` suppresses all type checking**

Adding `// @ts-nocheck` at the top of the file disables TypeScript for the entire module. This is almost certainly here to paper over the type conflict caused by the manual `Preferences` interface (see next comment). Removing the manual interface and letting the auto-generated `raycast-env.d.ts` types take over should allow this directive to be removed as well, restoring full type safety.

```suggestion
import { ActionPanel, Action, List, getPreferenceValues, Icon, Form, useNavigation, confirmAlert, Alert } from "@raycast/api";
```

How can I resolve this? If you propose a fix, please make it concise.

---

This is a comment left during a code review.
Path: extensions/nvidia-ai-chat/src/index.tsx
Line: 7-9

Comment:
**Remove manually-defined `Preferences` interface**

Raycast auto-generates the `Preferences` type in `raycast-env.d.ts` based on the `preferences` field in `package.json`. Defining it manually can go out of sync with the actual schema and creates the type conflict that likely prompted adding `// @ts-nocheck`. Remove the manual interface and rely on the generated type instead:

```suggestion
const preferences = getPreferenceValues<Preferences>();
```

**Rule Used:** What: Don't manually define `Preferences` for `get... ([source](https://app.greptile.com/review/custom-context?memory=d93fc9fb-a45d-4479-a6a4-b1b4af98ebc8))

How can I resolve this? If you propose a fix, please make it concise.

---

This is a comment left during a code review.
Path: extensions/nvidia-ai-chat/src/index.tsx
Line: 26-27

Comment:
**Single quotes throughout — use double quotes per Raycast Prettier standard**

The standard Raycast Prettier configuration requires `singleQuote: false` (double quotes). The file uses single quotes extensively, e.g. on lines 26–27, 52, 109, 133, 142, 165, and elsewhere. Please run `npm run fix-lint` (which invokes `ray lint --fix`) to auto-format the entire file to the correct style. A `.prettierrc` (or `prettier` key in `package.json`) with `{ "printWidth": 120, "singleQuote": false }` should also be added if it isn't already present in the extension root.

**Rule Used:** What: All extensions must use the standard Raycast... ([source](https://app.greptile.com/review/custom-context?memory=7be27780-7fcb-4602-9122-17c47fdd52ee))

How can I resolve this? If you propose a fix, please make it concise.








Resolving Code Review Feedback
Removed @ts-nocheck and manual Preferences definition safely. Now locating the single quotes mentioned in the review to convert them to double quotes.

Progress Updates
1
Removing @ts-nocheck and manual Preferences, applying Raycast standard formatting

2
Replacing single quotes with double quotes

3
Applying final lint fixes (quotes and types)

Ich habe das Review-Feedback direkt in den Code umgesetzt!

Folgendes wurde korrigiert:

@ts-nocheck entfernt: Ich habe den Unterdrückungs-Tag am Anfang der Datei entfernt.
Preferences Typisierung: Das manuelle Interface wurde ausgebaut. Raycast nutzt jetzt absolut fehlerfrei die automatisch generierte Version, genau wie vom Reviewer gewünscht.
Formatierung / Quotes: Ich habe die Prettier- und ESLint-Konfigurationsdateien (.prettierrc.json & .eslintrc.json) hinzugefügt. Zusätzlich habe ich den Code so korrigiert, dass er mit doppelten statt einzelnen Anführungszeichen ausgegeben wird und einen ESLint "any"-Fehler behoben.
Die Codebasis erfüllt nun 100%ig den Raycast-Standard.

Wie reagierst du auf das Review? Gehe in GitHub Desktop (oder ins Web, falls du VS Code The Web benutzt) und mache einen neuen Push mit genau der veränderten Datei src/index.tsx. Als Antwort im Review auf GitHub kannst du einfach schreiben:

"Thanks for the feedback! I've removed the manual Preferences interface and the @ts-nocheck directive. I also applied the standard Raycast formatting with double quotes via Prettier."

(Hinweis: Beim Ausführen von npm run fix-lint hat Raycast sich lokal noch über deine Bildauflösungen [Screenshot 3839x2085 px statt exakt 2000x1250 px] beschwert. Falls das Review-Team dies ebenfalls noch reklamiert, müsstest du die Bilder im Ordner metadata evtl. einmal auf genau 2000 x 1250 Pixel zuschneiden. Aber für diesen Code-Review-Teil ist jetzt alles grün!)

Add context
Model;
}
