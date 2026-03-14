import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import type { Session } from "@opencode-ai/sdk/v2";
import { useEffect, useMemo, useState } from "react";
import { ModelPickerView } from "./components/ModelPickerView";
import { SessionDetailView } from "./components/SessionDetailView";
import { TargetForm } from "./components/TargetForm";
import {
  createClient,
  createSession,
  listModels,
  listSessions,
  listWorkspaces,
  promptSession,
} from "./lib/opencode";
import { getPreferences } from "./lib/preferences";
import { SEND_ICON } from "./lib/raycast-icons";
import {
  resolveServerCandidates,
  resolveServerUrl,
} from "./lib/server-discovery";
import {
  getLastTarget,
  getRecentModels,
  getRecentSessions,
  getRecentTargets,
  getSelectedModel,
  saveRecentSession,
  saveRecentTarget,
  saveSelectedModel,
} from "./lib/storage";
import { targetDropdownTitle } from "./lib/target-display";
import type {
  ModelOption,
  OpencodeTarget,
  RecentSession,
  RecentTarget,
  WorkspaceOption,
} from "./lib/types";

export default function Command() {
  const preferences = useMemo(() => getPreferences(), []);
  const { push } = useNavigation();
  const [serverUrl, setServerUrl] = useState<string>();
  const [serverCandidates, setServerCandidates] = useState<string[]>([]);
  const client = useMemo(
    () => (serverUrl ? createClient(serverUrl) : undefined),
    [serverUrl],
  );
  const [target, setTarget] = useState<OpencodeTarget>();
  const [recentTargets, setRecentTargets] = useState<RecentTarget[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [recentModels, setRecentModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelOption>();
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function handleModelSelected(model: ModelOption) {
    if (!target) {
      return;
    }
    setSelectedModel(model);
    await saveSelectedModel(target, model);
    setRecentModels(await getRecentModels(target));
    const toast = await showToast({
      style: Toast.Style.Success,
      title: "Model updated",
    });
    toast.message = `${model.providerID}/${model.modelID}`;
  }

  async function refreshRecents(nextTarget?: OpencodeTarget) {
    const [targets, lastTarget] = await Promise.all([
      getRecentTargets(),
      getLastTarget(),
    ]);
    const activeTarget =
      nextTarget ??
      lastTarget ??
      (preferences.defaultDirectory
        ? { directory: preferences.defaultDirectory }
        : undefined);
    setRecentTargets(targets);
    setTarget(activeTarget);
    setRecentSessions(
      activeTarget ? await getRecentSessions(activeTarget) : [],
    );
    setRecentModels(activeTarget ? await getRecentModels(activeTarget) : []);
    setSelectedModel(
      activeTarget ? await getSelectedModel(activeTarget) : undefined,
    );
    return activeTarget;
  }

  async function refreshServerDiscovery() {
    const [resolved, candidates] = await Promise.all([
      resolveServerUrl(),
      resolveServerCandidates(),
    ]);
    setServerUrl(resolved);
    setServerCandidates(candidates);
    return resolved;
  }

  async function refreshWorkspaces(
    nextTarget?: OpencodeTarget,
    nextClient = client,
  ) {
    const activeTarget = nextTarget ?? target;
    if (!nextClient || !activeTarget?.directory) {
      setWorkspaces([]);
      return;
    }
    try {
      setWorkspaces(await listWorkspaces(nextClient, activeTarget));
    } catch {
      setWorkspaces([]);
    }
  }

  async function refreshSessions(
    nextTarget?: OpencodeTarget,
    nextClient = client,
  ) {
    const activeTarget = nextTarget ?? target;
    if (!nextClient || !activeTarget?.directory) {
      setSessions([]);
      return;
    }
    try {
      setSessions(await listSessions(nextClient, activeTarget));
    } catch {
      setSessions([]);
    }
  }

  async function refreshModels(
    nextTarget?: OpencodeTarget,
    nextClient = client,
  ) {
    const activeTarget = nextTarget ?? target;
    if (!nextClient || !activeTarget?.directory) {
      setModels([]);
      return;
    }
    try {
      const nextModels = await listModels(nextClient, activeTarget);
      setModels(nextModels);
      const storedModel = await getSelectedModel(activeTarget);
      const matchedStored = storedModel
        ? nextModels.find(
            (item) =>
              item.providerID === storedModel.providerID &&
              item.modelID === storedModel.modelID,
          )
        : undefined;
      const defaultModel =
        nextModels.find((item) => item.isConnected && item.isDefault) ??
        nextModels.find((item) => item.isDefault) ??
        nextModels[0];
      setSelectedModel(matchedStored ?? defaultModel);
    } catch {
      setModels([]);
    }
  }

  async function initialize() {
    setIsLoading(true);
    try {
      const resolved = await refreshServerDiscovery();
      const activeTarget = await refreshRecents();
      if (resolved && activeTarget) {
        await refreshWorkspaces(activeTarget, createClient(resolved));
        await refreshModels(activeTarget, createClient(resolved));
        await refreshSessions(activeTarget, createClient(resolved));
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void initialize();
  }, []);

  useEffect(() => {
    void refreshWorkspaces();
  }, [client, target?.directory, target?.workspace]);

  useEffect(() => {
    void refreshModels();
  }, [client, target?.directory, target?.workspace]);

  useEffect(() => {
    void refreshSessions();
  }, [client, target?.directory, target?.workspace]);

  async function openConversation(
    sessionID: string,
    nextTarget: OpencodeTarget,
  ) {
    if (!serverUrl) {
      return;
    }
    push(
      <SessionDetailView
        serverUrl={serverUrl}
        target={nextTarget}
        sessionID={sessionID}
        recentTargets={recentTargets}
        recentSessions={recentSessions}
        workspaces={workspaces}
        onTargetTouched={async () => {
          await refreshRecents(nextTarget);
        }}
      />,
    );
  }

  async function sendMessage() {
    if (!client) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No OpenCode server found",
      });
      return;
    }
    if (!target?.directory) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose a target first",
      });
      return;
    }
    const text = searchText.trim();
    if (!text) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting conversation...",
    });
    try {
      const session = await createSession(client, {
        target,
        title: text.slice(0, 60),
      });
      await saveRecentTarget(target);
      if (selectedModel) {
        await saveSelectedModel(target, selectedModel);
      }
      await saveRecentSession({ id: session.id, title: session.title }, target);
      setSearchText("");
      await refreshRecents(target);
      await openConversation(session.id, target);
      await promptSession(client, {
        target,
        sessionID: session.id,
        text,
        model: selectedModel
          ? {
              providerID: selectedModel.providerID,
              modelID: selectedModel.modelID,
            }
          : undefined,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Conversation started";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to send message";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        serverUrl ? "Type a message" : "No OpenCode server detected"
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Target"
          value={target ? `${target.directory}::${target.workspace ?? ""}` : ""}
          onChange={async (value) => {
            const match = recentTargets.find(
              (item) => `${item.directory}::${item.workspace ?? ""}` === value,
            );
            if (!match) {
              return;
            }
            const nextTarget = {
              directory: match.directory,
              workspace: match.workspace,
            };
            setTarget(nextTarget);
            setRecentSessions(await getRecentSessions(nextTarget));
            await refreshWorkspaces(nextTarget);
            await refreshModels(nextTarget);
            await refreshSessions(nextTarget);
          }}
        >
          {recentTargets.map((item) => (
            <List.Dropdown.Item
              key={`${item.directory}::${item.workspace ?? ""}`}
              title={targetDropdownTitle(item)}
              value={`${item.directory}::${item.workspace ?? ""}`}
              keywords={[item.directory, item.label]}
            />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Send Message"
            icon={SEND_ICON}
            onAction={sendMessage}
          />
          <Action
            title="Select Model"
            icon={Icon.BulletPoints}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            onAction={() =>
              push(
                <ModelPickerView
                  models={models}
                  recentModels={recentModels}
                  selectedModel={selectedModel}
                  onSelect={handleModelSelected}
                />,
              )
            }
          />
          <Action
            title="Set Directory"
            icon={Icon.Folder}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() =>
              push(
                <TargetForm
                  recentTargets={recentTargets}
                  initialTarget={target}
                  onSave={async (nextTarget) => {
                    setTarget(nextTarget);
                    setRecentSessions(await getRecentSessions(nextTarget));
                    await refreshWorkspaces(nextTarget);
                    await refreshModels(nextTarget);
                    await refreshSessions(nextTarget);
                  }}
                />,
              )
            }
          />
          <Action
            title="Refresh Servers"
            icon={Icon.Network}
            onAction={initialize}
          />
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      {!serverUrl ? (
        <List.EmptyView
          icon={Icon.Network}
          title="No OpenCode Server Found"
          description={
            serverCandidates.length > 0
              ? `Tried ${serverCandidates.slice(0, 5).join(", ")}`
              : "Start opencode serve, then refresh."
          }
        />
      ) : null}
      {serverUrl ? (
        <List.Section
          title={`Ask OpenCode${target ? ` • ${target.directory}` : ""}`}
        >
          <List.Item
            title={
              searchText.trim()
                ? `Send: ${searchText.trim()}`
                : "Type a message above"
            }
            subtitle={
              selectedModel
                ? `${selectedModel.providerID}/${selectedModel.modelID}`
                : "Starts a new session"
            }
            icon={SEND_ICON}
            actions={
              <ActionPanel>
                <Action
                  title="Send Message"
                  icon={SEND_ICON}
                  onAction={sendMessage}
                />
                <Action
                  title="Select Model"
                  icon={Icon.BulletPoints}
                  shortcut={{ modifiers: ["cmd"], key: "m" }}
                  onAction={() =>
                    push(
                      <ModelPickerView
                        models={models}
                        recentModels={recentModels}
                        selectedModel={selectedModel}
                        onSelect={handleModelSelected}
                      />,
                    )
                  }
                />
                <Action
                  title="Set Directory"
                  icon={Icon.Folder}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() =>
                    push(
                      <TargetForm
                        recentTargets={recentTargets}
                        initialTarget={target}
                        onSave={async (nextTarget) => {
                          setTarget(nextTarget);
                          setRecentSessions(
                            await getRecentSessions(nextTarget),
                          );
                          await refreshWorkspaces(nextTarget);
                          await refreshModels(nextTarget);
                          await refreshSessions(nextTarget);
                        }}
                      />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      {serverUrl && sessions.length > 0 ? (
        <List.Section title="Latest Sessions">
          {sessions.map((session) => (
            <List.Item
              key={session.id}
              title={session.title || session.id}
              subtitle="Open conversation"
              icon={Icon.Message}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Session"
                    onAction={async () => {
                      if (!target) {
                        return;
                      }
                      await openConversation(session.id, target);
                    }}
                  />
                  <Action
                    title="New Message"
                    icon={SEND_ICON}
                    onAction={sendMessage}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
