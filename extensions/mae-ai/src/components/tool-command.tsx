import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useModels } from "../hooks/use-models";
import { Preferences } from "../lib/preferences";
import { responseRows } from "../lib/response-rows";
import { conversationPresentation } from "../lib/scroll-policy";
import { useFollowLatest } from "../hooks/use-follow-latest";
import { conversationMessages, needsLanguage, Turn } from "../lib/session";
import { loadTools, restoreTool, saveTool } from "../lib/storage";
import {
  Message,
  Provider,
  providerForTool,
  streamCompletion,
} from "../lib/stream";
import {
  builtInTools,
  Tool,
  toolDeeplink,
  toolPlaceholder,
} from "../lib/tools";
import SettingsView from "./settings-view";
import ToolEditor, { languages } from "./tool-editor";
import RemoteAgentView from "./remote-agent-view";
import { agentScope, normalizeAgentUrl } from "../lib/agents/types";
import {
  effectiveAgentSettings,
  SavedAgentSettings,
} from "../lib/agent-settings";
import {
  loadAgentSettings,
  switchAgentBackend,
} from "../lib/agent-settings-storage";
import AgentSettingsView from "./agent-settings";
import BackendMenu, { BackendChange } from "./backend-menu";

interface Request {
  id: number;
  messages: Message[];
  provider: Provider;
}

function LanguagePicker({
  tool,
  onChoose,
}: {
  tool: Tool;
  onChoose: (saved: Tool) => void;
}) {
  const { pop } = useNavigation();
  const [query, setQuery] = useState("");
  async function choose(language: string) {
    try {
      const saved = { ...tool, targetLanguage: language };
      await saveTool(saved);
      onChoose(saved);
      pop();
    } catch (failure) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Save Language",
        message: failure instanceof Error ? failure.message : String(failure),
      });
    }
  }
  const options = [
    ...new Set([
      ...(tool.targetLanguage ? [tool.targetLanguage] : []),
      ...languages,
    ]),
  ].filter((language) => language.toLowerCase().includes(query.toLowerCase()));
  return (
    <List
      navigationTitle="Choose Translation Language"
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      searchBarPlaceholder="Find a language, or type your own..."
    >
      {options.map((language) => (
        <List.Item
          key={language}
          title={language}
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action
                title="Use This Language"
                onAction={() => choose(language)}
              />
            </ActionPanel>
          }
        />
      ))}
      {query.trim() &&
        !options.some(
          (language) => language.toLowerCase() === query.trim().toLowerCase(),
        ) && (
          <List.Item
            title={`Use "${query.trim()}"`}
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action
                  title="Use This Language"
                  onAction={() => choose(query.trim())}
                />
              </ActionPanel>
            }
          />
        )}
    </List>
  );
}

function QueryView({
  tool,
  initialQuery,
  autoSubmitInitialQuery,
  onBackendChange,
  onToolChange,
  onToolsChanged,
}: {
  tool: Tool;
  initialQuery: string;
  autoSubmitInitialQuery: boolean;
  onBackendChange?: BackendChange;
  onToolChange: (saved: Tool) => void;
  onToolsChanged: () => Promise<void>;
}) {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const [query, setQuery] = useState(initialQuery);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [request, setRequest] = useState<Request>();
  const [loading, setLoading] = useState(false);
  const [rich, setRich] = useState(preferences.responseView !== "plain");
  const controller = useRef<AbortController | undefined>(undefined);
  const nextId = useRef(0);
  const autoSubmitted = useRef(false);
  const language = tool.targetLanguage || "";
  const languageRequired = needsLanguage(tool) && !language;
  const presentation = useMemo(
    () => conversationPresentation(turns, rich),
    [turns, rich],
  );
  const follow = useFollowLatest(
    presentation.latestId,
    presentation.itemIds,
    loading,
  );
  const { following } = follow;
  const providerResult = useMemo(() => {
    try {
      return {
        provider: providerForTool(
          {
            baseUrl: preferences.baseUrl,
            apiKey: preferences.apiKey,
            model: "",
          },
          { baseUrl: tool.baseUrl },
        ),
      };
    } catch (failure) {
      return {
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  }, [preferences.baseUrl, preferences.apiKey, tool.baseUrl]);
  const provider = providerResult.provider || {
    baseUrl: preferences.baseUrl,
    model: "",
  };
  const selection = useModels(
    provider,
    tool.model || preferences.model,
    tool.id,
  );
  const chooseLanguage = useCallback(() => {
    push(<LanguagePicker tool={tool} onChoose={onToolChange} />);
  }, [push, tool, onToolChange]);

  const send = useCallback(
    (text: string, replaceLast = false) => {
      if (!text.trim()) return;
      if (languageRequired) {
        chooseLanguage();
        return;
      }
      if (providerResult.error || !selection.model) {
        void showToast({
          style: Toast.Style.Failure,
          title: "Check AI Provider and Model",
          message:
            providerResult.error ||
            selection.error ||
            "Choose a model from the dropdown.",
        });
        return;
      }
      const previous = replaceLast ? turns.slice(0, -1) : turns;
      const messages = conversationMessages(tool, previous, text, language);
      controller.current?.abort();
      const id = ++nextId.current;
      setTurns([
        ...previous.map((turn) =>
          turn.status === "streaming"
            ? { ...turn, status: "stopped" as const }
            : turn,
        ),
        {
          id,
          query: text.trim(),
          answer: "",
          model: selection.model,
          status: "streaming",
        },
      ]);
      setQuery("");
      setLoading(true);
      follow.resume();
      setRequest({
        id,
        messages,
        provider: { ...provider, model: selection.model },
      });
    },
    [
      languageRequired,
      chooseLanguage,
      providerResult,
      selection.model,
      selection.error,
      turns,
      tool,
      language,
      provider,
      follow.resume,
    ],
  );

  useEffect(() => {
    if (
      autoSubmitInitialQuery &&
      initialQuery.trim() &&
      !autoSubmitted.current &&
      !selection.loading &&
      selection.model &&
      !languageRequired
    ) {
      autoSubmitted.current = true;
      send(initialQuery);
    }
  }, [
    autoSubmitInitialQuery,
    initialQuery,
    selection.loading,
    selection.model,
    languageRequired,
    send,
  ]);

  const updateTurn = useCallback((id: number, patch: Partial<Turn>) => {
    setTurns((current) =>
      current.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)),
    );
  }, []);

  useEffect(() => {
    if (!request) return;
    const abort = new AbortController();
    controller.current = abort;
    let active = true;
    let text = "";
    let timer: ReturnType<typeof setTimeout> | undefined;
    void streamCompletion(
      request.provider,
      request.messages,
      (token) => {
        text += token;
        if (!timer) {
          timer = setTimeout(() => {
            if (active) {
              updateTurn(request.id, { answer: text });
            }
            timer = undefined;
          }, 40);
        }
      },
      abort.signal,
    )
      .catch((failure: unknown) => {
        if (!active || abort.signal.aborted) return;
        updateTurn(request.id, {
          status: "error",
          error: failure instanceof Error ? failure.message : String(failure),
        });
      })
      .finally(() => {
        if (timer) clearTimeout(timer);
        if (active) {
          setTurns((current) =>
            current.map((turn) =>
              turn.id === request.id
                ? {
                    ...turn,
                    answer: text,
                    status:
                      turn.status === "streaming"
                        ? abort.signal.aborted
                          ? "stopped"
                          : "complete"
                        : turn.status,
                  }
                : turn,
            ),
          );
          setLoading(false);
        }
      });
    return () => {
      active = false;
      abort.abort();
      if (timer) clearTimeout(timer);
    };
  }, [request, updateTurn]);

  function stop() {
    controller.current?.abort();
    if (request) updateTurn(request.id, { status: "stopped" });
    setLoading(false);
  }

  const last = turns.at(-1);
  const canStop = loading && !query.trim();
  const orderedModels = [
    ...selection.models.filter((model) => model.id === selection.model),
    ...selection.models.filter((model) => model.id !== selection.model),
  ];
  const transcript = turns
    .map((turn) => `## You\n\n${turn.query}\n\n## Pocket AI\n\n${turn.answer}`)
    .join("\n\n---\n\n");
  const actions = (
    <ActionPanel>
      <Action
        title={
          languageRequired
            ? "Choose Translation Language"
            : canStop
              ? "Stop Generation"
              : turns.length
                ? "Send Follow-Up"
                : "Send to AI"
        }
        icon={
          languageRequired ? Icon.Globe : canStop ? Icon.Stop : Icon.Message
        }
        onAction={
          languageRequired
            ? chooseLanguage
            : canStop
              ? stop
              : () => {
                  if (query.trim()) send(query);
                  else
                    void showToast({
                      style: Toast.Style.Failure,
                      title: "Type in the Top Input Bar",
                    });
                }
        }
      />
      {onBackendChange && (
        <BackendMenu
          backend="direct"
          query={query}
          onChange={onBackendChange}
        />
      )}
      {last?.answer && (
        <Action.CopyToClipboard
          title="Copy Latest Response"
          content={last.answer}
        />
      )}
      {last && (
        <Action
          title={following ? "Pause Auto-Scroll" : "Jump to Latest and Resume"}
          icon={Icon.ArrowDown}
          shortcut={{
            Windows: { modifiers: ["ctrl"], key: "l" },
            macOS: { modifiers: ["cmd"], key: "l" },
          }}
          onAction={follow.toggle}
        />
      )}
      <Action
        title={rich ? "Use Full-Width Text" : "Show Rich Markdown"}
        icon={Icon.Document}
        onAction={() => {
          setRich((value) => !value);
          follow.resume();
        }}
      />
      <Action
        title="Customize This Tool"
        icon={Icon.Gear}
        shortcut={Keyboard.Shortcut.Common.Edit}
        onAction={() =>
          push(
            <ToolEditor
              tool={tool}
              onSave={onToolChange}
              onDelete={onToolsChanged}
            />,
          )
        }
      />
      <Action
        title="Pocket AI Settings"
        icon={Icon.Gear}
        shortcut={{
          Windows: { modifiers: ["ctrl", "shift"], key: "," },
          macOS: { modifiers: ["cmd", "shift"], key: "," },
        }}
        onAction={() => push(<SettingsView onChange={onToolsChanged} />)}
      />
      {needsLanguage(tool) && (
        <Action
          title={
            language
              ? `Translate into ${language}`
              : "Choose Translation Language"
          }
          icon={Icon.Globe}
          onAction={chooseLanguage}
        />
      )}
      {last && !loading && (
        <Action
          title={
            last.status === "error"
              ? "Retry Last Request"
              : "Regenerate Last Response"
          }
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => send(last.query, true)}
        />
      )}
      {last?.answer && (
        <Action
          title="Open Formatted Conversation"
          icon={Icon.Document}
          onAction={() =>
            push(
              <Detail
                navigationTitle={tool.title}
                markdown={transcript}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Conversation"
                      content={transcript}
                    />
                  </ActionPanel>
                }
              />,
            )
          }
        />
      )}
      <Action
        title="New Conversation"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={() => {
          stop();
          setRequest(undefined);
          setTurns([]);
          setQuery("");
          follow.reset();
        }}
      />
      <Action.CreateQuicklink
        title="Add This Command to Raycast"
        quicklink={{ name: tool.title, link: toolDeeplink(tool) }}
      />
      <Action
        title="Refresh Models"
        icon={Icon.ArrowClockwise}
        onAction={selection.reload}
      />
      <Action
        title="Use Clipboard"
        icon={Icon.Clipboard}
        shortcut={{
          Windows: { modifiers: ["ctrl", "shift"], key: "v" },
          macOS: { modifiers: ["cmd", "shift"], key: "v" },
        }}
        onAction={async () => setQuery((await Clipboard.readText()) ?? "")}
      />
      <Action
        title="Configure AI Provider"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );

  return (
    <List
      navigationTitle={`Pocket AI - ${tool.title}${onBackendChange ? " · Direct Model" : ""}${following ? "" : " / Auto-scroll Paused"}`}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={toolPlaceholder(tool, turns.length > 0, language)}
      filtering={false}
      selectedItemId={follow.selectedItemId}
      onSelectionChange={follow.onSelectionChange}
      isShowingDetail={rich && turns.length > 0}
      isLoading={loading || selection.loading}
      actions={actions}
      searchBarAccessory={
        !selection.loading && selection.models.length ? (
          <List.Dropdown
            id={`pocket-ai-model-${tool.id}`}
            tooltip="Choose AI Model"
            placeholder="Search models..."
            value={selection.model}
            defaultValue={selection.model}
            storeValue={false}
            onChange={selection.selectModel}
          >
            {orderedModels.map((model) => (
              <List.Dropdown.Item
                key={model.id}
                value={model.id}
                title={model.name}
              />
            ))}
          </List.Dropdown>
        ) : null
      }
    >
      {languageRequired && (
        <List.Item
          title="Choose a Translation Language"
          subtitle="No target language selected"
          icon={Icon.Globe}
          actions={actions}
        />
      )}
      {!turns.length && !languageRequired && !providerResult.error && (
        <List.EmptyView
          icon="pocket-ai-native.png"
          title={tool.title}
          description={
            selection.error ||
            "Type in the top bar and press Enter. Follow-ups keep the same conversation."
          }
        />
      )}
      {providerResult.error && (
        <List.Item
          title="Check API Endpoint"
          subtitle={providerResult.error}
          icon={Icon.Warning}
          actions={actions}
        />
      )}
      {presentation.entries.map(({ turn, queryRows, answerRows }) => [
        <List.Section key={`you-${turn.id}`} title="You">
          {queryRows.map((row) => (
            <List.Item
              key={row.id}
              id={row.id}
              title={rich ? responseRows(row.text)[0] || "Question" : row.text}
              detail={
                rich ? <List.Item.Detail markdown={row.text} /> : undefined
              }
              actions={actions}
            />
          ))}
        </List.Section>,
        <List.Section key={`ai-${turn.id}`} title={`Pocket AI / ${turn.model}`}>
          {answerRows.map((row) => (
            <List.Item
              key={row.id}
              id={row.id}
              title={rich ? "Response" : row.text}
              detail={
                rich ? (
                  <List.Item.Detail
                    markdown={row.text}
                    isLoading={turn.status === "streaming"}
                  />
                ) : undefined
              }
              actions={actions}
            />
          ))}
          {turn.status === "streaming" && !answerRows.length && (
            <List.Item
              id={`turn-${turn.id}-status`}
              title="Waiting for the first token..."
              icon="pocket-ai-native.png"
              actions={actions}
            />
          )}
          {turn.status === "error" && (
            <List.Item
              id={`turn-${turn.id}-error`}
              title="Request Failed"
              subtitle={turn.error}
              detail={
                rich ? (
                  <List.Item.Detail
                    markdown={turn.error || "Request failed."}
                  />
                ) : undefined
              }
              icon={Icon.Warning}
              actions={actions}
            />
          )}
          {turn.status === "stopped" && (
            <List.Item
              id={`turn-${turn.id}-stopped`}
              title="Generation Stopped"
              detail={
                rich ? <List.Item.Detail markdown={turn.answer} /> : undefined
              }
              icon={Icon.Stop}
              actions={actions}
            />
          )}
        </List.Section>,
      ])}
    </List>
  );
}

export default function ToolCommand({
  id,
  initialQuery = "",
}: {
  id: string;
  initialQuery?: string;
}) {
  const [tool, setTool] = useState<Tool>();
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [agentSettings, setAgentSettings] = useState<SavedAgentSettings>();
  const [launch, setLaunch] = useState({
    query: initialQuery,
    autoSubmit: true,
  });
  const launchQuery = launch.query;
  const autoSubmitInitialQuery = launch.autoSubmit;
  const switching = useRef(false);
  const reload = useCallback(async () => {
    try {
      const [tools, saved] = await Promise.all([
        loadTools(),
        id === "ask-ai" ? loadAgentSettings() : Promise.resolve(undefined),
      ]);
      setLaunch({ query: "", autoSubmit: false });
      setAgentSettings(saved);
      const found = tools.find((candidate) => candidate.id === id);
      setTool(found);
      setMissing(!found);
      setError(
        found
          ? ""
          : "This command was deleted. Open Pocket AI Settings to restore a built-in or add a new command.",
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }, [id]);
  const changeBackend: BackendChange = async (backend, draft) => {
    if (switching.current) return;
    switching.current = true;
    try {
      const saved = await switchAgentBackend(backend);
      if (!saved) return;
      setLaunch({ query: draft, autoSubmit: false });
      setAgentSettings(saved);
    } catch (failure) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Switch AI Backend",
        message: failure instanceof Error ? failure.message : String(failure),
      });
    } finally {
      switching.current = false;
    }
  };
  useEffect(() => {
    let active = true;
    Promise.all([
      loadTools(),
      id === "ask-ai" ? loadAgentSettings() : Promise.resolve(undefined),
    ])
      .then(([tools, saved]) => {
        if (!active) return;
        setAgentSettings(saved);
        const found = tools.find((candidate) => candidate.id === id);
        if (found) setTool(found);
        else {
          setMissing(true);
          setError(
            "This command was deleted. Open Pocket AI Settings to restore a built-in or add a new command.",
          );
        }
      })
      .catch((failure: unknown) => {
        if (active)
          setError(
            failure instanceof Error ? failure.message : String(failure),
          );
      });
    return () => {
      active = false;
    };
  }, [id]);
  if (error)
    return (
      <List
        navigationTitle="Pocket AI"
        actions={
          <ActionPanel>
            <Action.Push
              title="Pocket AI Settings"
              icon={Icon.Gear}
              target={<SettingsView onChange={reload} />}
            />
            {missing && builtInTools.some((item) => item.id === id) && (
              <Action
                title="Restore This Command"
                icon={Icon.ArrowCounterClockwise}
                onAction={async () => {
                  await restoreTool(id);
                  await reload();
                }}
              />
            )}
          </ActionPanel>
        }
      >
        <List.EmptyView
          title={missing ? "Command Deleted" : "Unable to Open Command"}
          description={error}
        />
      </List>
    );
  if (!tool)
    return <List isLoading searchBarPlaceholder="Loading Pocket AI..." />;
  const preferences = getPreferenceValues<Preferences>();
  const settings = effectiveAgentSettings(preferences, agentSettings);
  const backend = settings.backend;
  if (id === "ask-ai" && backend !== "direct") {
    try {
      const url = normalizeAgentUrl(
        backend,
        backend === "hermes" ? settings.hermesUrl : settings.openclawUrl,
      );
      const secret =
        backend === "hermes"
          ? preferences.hermesKey || ""
          : preferences.openclawToken || "";
      return (
        <RemoteAgentView
          key={agentScope({ backend, url, secret })}
          tool={tool}
          initialQuery={launchQuery}
          autoSubmitInitialQuery={autoSubmitInitialQuery}
          backend={backend}
          url={url}
          secret={secret}
          onSettingsChange={reload}
          onBackendChange={changeBackend}
        />
      );
    } catch (failure) {
      return (
        <List
          actions={
            <ActionPanel>
              <BackendMenu
                backend={backend}
                query={launchQuery}
                onChange={changeBackend}
              />
              <Action.Push
                title="Configure Remote Agents"
                target={<AgentSettingsView onSave={reload} />}
              />
            </ActionPanel>
          }
        >
          <List.EmptyView
            title="Invalid Agent URL"
            description={String(failure)}
          />
        </List>
      );
    }
  }
  return (
    <QueryView
      tool={tool}
      initialQuery={launchQuery}
      autoSubmitInitialQuery={autoSubmitInitialQuery}
      onBackendChange={id === "ask-ai" ? changeBackend : undefined}
      onToolChange={setTool}
      onToolsChanged={reload}
    />
  );
}
