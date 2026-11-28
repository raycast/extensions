import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { getConfig, isRecommendedModel, listModels, modelFor } from "./llm";
import { chosenModel, ModelSlot, setModel } from "./model-store";
import { checkKey, KeyStatus } from "./key-status";
import { AISetup } from "./setup-view";

const BUILT_IN: { slot: ModelSlot; title: string; icon: string }[] = [
  { slot: "translate", title: "Buddy Translate", icon: "buddy-translate.png" },
  { slot: "reply", title: "Buddy Draft Reply", icon: "buddy-draft-reply.png" },
  { slot: "rewrite", title: "Buddy Polish English", icon: "buddy-polish.png" },
];

/**
 * Connection row at the top of AI Buddy: the provider (with its logo) and whether it answers. Checked
 * once per key (by loading the model list); ↵ opens AI Setup to change provider, key or model.
 */
export function KeyStatusSection({ onChanged }: { onChanged?: () => void }) {
  const { provider } = getConfig();
  const abortable = useRef<AbortController>(null);
  const force = useRef(false); // Check Again skips the remembered result
  // checkKey answers at once when this key was checked before.
  const {
    data: status,
    isLoading: checking,
    revalidate,
  } = usePromise(
    async (): Promise<KeyStatus> => {
      const again = force.current;
      force.current = false;
      return checkKey(abortable.current?.signal ?? new AbortController().signal, again);
    },
    [],
    { abortable },
  );
  const run = (again: boolean) => {
    force.current = again;
    revalidate();
  };

  const subtitle = checking ? "Checking…" : status?.ok ? `Connected · ${status.count} models` : (status?.error ?? "");
  const state = checking
    ? { source: Icon.CircleProgress, tintColor: Color.SecondaryText }
    : status?.ok
      ? { source: Icon.CheckCircle, tintColor: Color.Green }
      : { source: Icon.XMarkCircle, tintColor: Color.Red };
  const detail = (
    <List.Item.Detail
      markdown={
        checking
          ? `## Checking ${provider.name}…`
          : status?.ok
            ? `## ✓ Connected\n\n**${provider.name}** · ${status.count} models available.\n\nPress **↵** to change the provider, key or model in **AI Setup**. **⌘M** on a buddy picks a model just for it.`
            : `## ✗ Not connected\n\n${status?.error ?? ""}\n\nPress **↵** to fix it in **AI Setup**.`
      }
    />
  );
  const afterSetup = () => {
    run(false); // AI Setup remembered its check, so this is instant
    onChanged?.();
  };

  return (
    <List.Section title="Connection">
      <List.Item
        title={provider.name}
        icon={provider.icon}
        // The list is narrow next to the detail panel: status as an icon (tooltip), details on the right.
        accessories={[{ icon: state, tooltip: subtitle }]}
        detail={detail}
        actions={
          <ActionPanel>
            <Action.Push title="AI Setup" icon={Icon.Plug} target={<AISetup onSaved={afterSetup} />} />
            <Action.Push
              title="Choose Models"
              icon={Icon.Stars}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              target={<ModelsList onChanged={onChanged} />}
            />
            <Action
              title="Check Again"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => run(true)}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

/** AI Buddy → Connection → Choose Models: the model of each command, for the current provider. */
export function ModelsList({ onChanged }: { onChanged?: () => void }) {
  const [, setVersion] = useState(0);
  const refresh = () => {
    setVersion((v) => v + 1);
    onChanged?.();
  };
  const { provider } = getConfig();

  const row = (slot: ModelSlot, title: string, icon: string) => {
    const own = chosenModel(provider.id, slot);
    return (
      <List.Item
        key={slot}
        title={title}
        icon={icon}
        subtitle={modelFor(slot)}
        accessories={[own ? { tag: { value: "chosen", color: Color.Blue } } : { text: "same as All Commands" }]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Choose Model"
              icon={Icon.Stars}
              target={<ModelPicker slot={slot} title={title} onChanged={refresh} />}
            />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List navigationTitle={`Models · ${provider.name}`} searchBarPlaceholder="Search commands">
      <List.Section title="All Commands">{row("default", "All Commands", "buddy.png")}</List.Section>
      <List.Section title="Commands">{BUILT_IN.map((b) => row(b.slot, b.title, b.icon))}</List.Section>
    </List>
  );
}

/**
 * Loads the provider's models (which also checks the API key) and saves the pick for one command.
 * A name that is not in the list can be typed and used as is (custom servers).
 */
export function ModelPicker({ slot, title, onChanged }: { slot: ModelSlot; title: string; onChanged?: () => void }) {
  const { pop } = useNavigation();
  const { provider, model: allCommands } = getConfig();
  const abortable = useRef<AbortController>(null);
  const { data: models, error: loadError } = usePromise(
    () => listModels(abortable.current?.signal ?? new AbortController().signal),
    [],
    {
      abortable,
      onData: (list) => void showToast({ style: Toast.Style.Success, title: `Connected · ${list.length} models` }),
      onError: (e) => void showFailureToast(e.message.split("\n")[0], { title: "Could not load models" }),
    },
  );
  const error = loadError?.message;
  const [typed, setTyped] = useState("");
  const [view, setView] = useState<"recommended" | "all">("recommended");
  const current = chosenModel(provider.id, slot);

  const choose = async (model: string | undefined) => {
    setModel(provider.id, slot, model);
    onChanged?.();
    await showToast({ style: Toast.Style.Success, title: `${title}: ${model ?? "default model"}` });
    pop();
  };

  const fallback =
    slot === "default"
      ? provider.defaultModel
        ? `Provider default (${provider.defaultModel})`
        : "No default: choose a model below or type its name"
      : `Same as All Commands (${allCommands})`;
  const name = typed.trim();
  // Recommended by default; typing searches every model.
  const recommended = (models ?? []).filter((m) => isRecommendedModel(m) || m === current);
  // A server whose models all look "not recommended" (llama3.2:latest…) still shows them.
  const shown = view === "all" || name || !recommended.length ? (models ?? []) : recommended;

  return (
    <List
      isLoading={models === undefined && !error}
      navigationTitle={`Model · ${title}`}
      filtering
      searchBarPlaceholder="Search models, or type a model name"
      onSearchTextChange={setTyped}
      searchBarAccessory={
        <List.Dropdown tooltip="Which models" value={view} onChange={(v) => setView(v as "recommended" | "all")}>
          <List.Dropdown.Item title="Recommended" value="recommended" />
          <List.Dropdown.Item title={`All Models${models ? ` (${models.length})` : ""}`} value="all" />
        </List.Dropdown>
      }
    >
      <List.Item
        title={fallback}
        icon={current ? Icon.Circle : Icon.CheckCircle}
        actions={
          <ActionPanel>
            <Action title="Use Default" icon={Icon.ArrowCounterClockwise} onAction={() => choose(undefined)} />
          </ActionPanel>
        }
      />
      {error && <List.Item title="Could not load models" subtitle={error.split("\n")[0]} icon={Icon.Warning} />}
      {shown.map((m) => (
        <List.Item
          key={m}
          title={m}
          icon={m === current ? Icon.CheckCircle : Icon.Circle}
          actions={
            <ActionPanel>
              <Action title="Use This Model" icon={Icon.Check} onAction={() => choose(m)} />
            </ActionPanel>
          }
        />
      ))}
      {name && !(models ?? []).includes(name) && (
        <List.Item
          title={`Use "${name}"`}
          subtitle="A model name that is not in the list"
          icon={Icon.Pencil}
          actions={
            <ActionPanel>
              <Action title={`Use "${name}"`} icon={Icon.Check} onAction={() => choose(name)} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
