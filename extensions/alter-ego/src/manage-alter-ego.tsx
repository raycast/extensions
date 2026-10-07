import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  environment,
  Form,
  Icon,
  LaunchProps,
  List,
  open,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { userInfo } from "node:os";
import { useEffect, useState } from "react";
import { TargetForm } from "./components/TargetForm";
import { removeRow, upsertRow } from "./lib/merge";
import {
  buildRunDeeplink,
  buildSearchQuicklinksDeeplink,
  extractPayloadFromLink,
  isAlterEgoLink,
} from "./lib/quicklink";
import { AlterEgoMap, AlterEgoPayload, Target } from "./lib/types";

type Source = "loading" | "hotkey" | "clipboard" | "new";

interface HandoffContext {
  payload?: AlterEgoPayload;
  source?: "hotkey" | "decode-error";
}

export default function Command(props: LaunchProps<{ launchContext?: HandoffContext }>) {
  const { push, pop } = useNavigation();
  const currentUsername = getCurrentUsername();

  const [map, setMap] = useState<AlterEgoMap>({});
  const [actionName, setActionName] = useState("");
  const [source, setSource] = useState<Source>("loading");
  const [hadDecodeError, setHadDecodeError] = useState(false);

  async function loadFromClipboard(): Promise<boolean> {
    const clipboardText = await Clipboard.readText();
    if (!clipboardText || !isAlterEgoLink(clipboardText)) {
      return false;
    }

    const result = extractPayloadFromLink(clipboardText);
    if (!result.ok) {
      return false;
    }

    setMap(result.payload.map);
    setActionName(result.payload.name);
    setSource("clipboard");
    return true;
  }

  useEffect(() => {
    async function resolve() {
      const context = props.launchContext;

      if (context?.payload) {
        setMap(context.payload.map);
        setActionName(context.payload.name);
        setSource("hotkey");
        return;
      }

      if (context?.source === "decode-error") {
        setHadDecodeError(true);
      }

      const loaded = await loadFromClipboard();
      if (!loaded) {
        setMap({});
        setActionName("");
        setSource("new");
      }
    }

    resolve();
  }, []);

  function handleAddOrEdit(initialUsername: string, initialTarget?: Target) {
    // Only offer "save & copy" once a Quicklink already exists to paste into —
    // for a brand-new setup the next step is Create Quicklink instead.
    const quicklinkExists = source !== "new";
    push(
      <TargetForm
        initialUsername={initialUsername}
        initialTarget={initialTarget}
        onSubmit={(username, target) => {
          setMap((current) => upsertRow(current, username, target));
          showToast({ style: Toast.Style.Success, title: `Saved — now ${nextStepTitle(source)}` });
        }}
        onSaveAndCopyLink={
          quicklinkExists
            ? (username, target) => {
                const updatedMap = upsertRow(map, username, target);
                setMap(updatedMap);
                copyUpdatedLinkAndOpenSearch(updatedMap);
              }
            : undefined
        }
      />,
    );
  }

  async function handleDelete(username: string) {
    const confirmed = await confirmAlert({
      title: `Remove mapping for "${username}"?`,
      message: `Remember to ${nextStepTitle(source)} afterwards to make this permanent.`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      setMap((current) => removeRow(current, username));
    }
  }

  // Takes an explicit map rather than reading state, so a just-computed map
  // (see `onSaveAndCopyLink` above) can be copied without waiting on a
  // re-render — setMap's update isn't visible in this closure yet.
  async function copyUpdatedLinkAndOpenSearch(mapToCopy: AlterEgoMap) {
    const trimmedName = actionName.trim();
    if (!trimmedName) {
      await showToast({ style: Toast.Style.Failure, title: "Set an action name first" });
      return;
    }
    const link = buildRunDeeplink(environment.ownerOrAuthorName, { name: trimmedName, map: mapToCopy });
    await Clipboard.copy(link);
    try {
      await open(buildSearchQuicklinksDeeplink());
      await showHUD("Copied — find your Alter Ego Quicklink, ⌘K → Edit → paste");
    } catch {
      // Search Quicklinks' path may differ on some Raycast versions — the copy
      // itself already succeeded, so fall back to manual directions.
      await showHUD("Copied — paste it into your Quicklink (Search Quicklinks → ⌘K → Edit)");
    }
  }

  async function handleCopyUpdatedLink() {
    await copyUpdatedLinkAndOpenSearch(map);
  }

  async function handleLoadFromClipboard() {
    const loaded = await loadFromClipboard();
    await showToast(
      loaded
        ? { style: Toast.Style.Success, title: "Loaded map from clipboard" }
        : { style: Toast.Style.Failure, title: "Clipboard doesn't contain an Alter Ego link" },
    );
  }

  // `onSaved` lets Add Mapping chain straight into TargetForm the first time,
  // instead of leaving the user to reopen Add Mapping after naming it.
  function handleEditActionName(onSaved?: () => void) {
    push(
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save Name"
              icon={Icon.Check}
              onSubmit={(values: { actionName: string }) => {
                const trimmed = values.actionName.trim();
                if (!trimmed) {
                  showToast({ style: Toast.Style.Failure, title: "Action name is required" });
                  return;
                }
                setActionName(trimmed);
                pop();
                onSaved?.();
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="actionName"
          title="Action Name"
          placeholder="e.g. Browser"
          defaultValue={actionName}
          info='Every Alter Ego Quicklink needs a name, e.g. "Alter Ego: Browser", so you can find and tell them apart in Search Quicklinks.'
        />
      </Form>,
    );
  }

  function handleAddMapping() {
    if (actionName.trim()) {
      handleAddOrEdit(currentUsername ?? "");
      return;
    }
    // First mapping ever: get the name out of the way, then go straight into
    // the target form — no separate "name it first" screen to sit through.
    handleEditActionName(() => handleAddOrEdit(currentUsername ?? ""));
  }

  const usernames = Object.keys(map).sort((a, b) => {
    if (a === currentUsername) return -1;
    if (b === currentUsername) return 1;
    return a.localeCompare(b);
  });

  const trimmedActionName = actionName.trim();
  const hasName = trimmedActionName !== "";

  const setNameAction = (
    <Action
      title={hasName ? "Edit Action Name" : "Set Action Name"}
      icon={Icon.Pencil}
      onAction={handleEditActionName}
    />
  );

  // Doesn't block on a missing name — handleAddMapping asks for it inline
  // and continues straight into the target form.
  const addMappingAction = <Action title="Add Mapping" icon={Icon.Plus} onAction={handleAddMapping} />;

  const createQuicklinkAction = hasName ? (
    <Action.CreateQuicklink
      title="Create Quicklink"
      quicklink={{
        name: `Alter Ego: ${trimmedActionName}`,
        link: buildRunDeeplink(environment.ownerOrAuthorName, { name: trimmedActionName, map }),
      }}
    />
  ) : (
    <Action
      title="Create Quicklink"
      icon={Icon.ExclamationMark}
      onAction={() => showToast({ style: Toast.Style.Failure, title: "Set an action name first" })}
    />
  );

  // Order matters: this section's first entry becomes each row's default
  // (Enter) action, so the name action goes last — reachable from every row
  // via the action panel (⌘K), but never hijacking Enter on unrelated rows.
  const sharedActions = (
    <ActionPanel.Section>
      {addMappingAction}
      <Action title="Copy Updated Link" icon={Icon.Clipboard} onAction={handleCopyUpdatedLink} />
      {createQuicklinkAction}
      <Action title="Load from Pasted Link" icon={Icon.ArrowClockwise} onAction={handleLoadFromClipboard} />
      {setNameAction}
    </ActionPanel.Section>
  );

  // Nothing configured at all yet in this session — a real onboarding moment,
  // as opposed to "action name set but no rows yet" which stays inline below.
  const isFreshStart = source !== "loading" && !trimmedActionName && usernames.length === 0;

  // No Quicklink exists yet (see `nextStepTitle`) but setup is otherwise
  // complete — the one thing left to do is create it.
  const readyToCreateQuicklink = source === "new" && trimmedActionName !== "" && usernames.length > 0;

  return (
    <List isLoading={source === "loading"} filtering={false}>
      {isFreshStart ? (
        <List.EmptyView
          icon={hadDecodeError ? Icon.Warning : Icon.Person}
          title={hadDecodeError ? "Couldn't Read Your Previous Mapping" : "Welcome to Alter Ego"}
          description={
            hadDecodeError
              ? 'Add a mapping for this macOS user to rebuild it, or copy your existing Quicklink\'s link ("Search Quicklinks" → ⌘K → Copy Link) and reopen this command to reload it.'
              : "Add a target for this macOS user to get started — you'll name this mapping first, then Create Quicklink to finish."
          }
          actions={
            <ActionPanel>
              {addMappingAction}
              {sharedActions}
            </ActionPanel>
          }
        />
      ) : (
        <>
          {readyToCreateQuicklink && (
            <List.Section title="Next Step">
              <List.Item
                title="Create Quicklink"
                subtitle="Nothing is saved outside this screen yet — create it and assign a hotkey to finish setup"
                icon={Icon.Star}
                actions={
                  <ActionPanel>
                    {createQuicklinkAction}
                    {sharedActions}
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
          <List.Section title={sourceLabel(source, hadDecodeError)}>
            {usernames.length > 0 ? (
              usernames.map((username) => {
                const target = map[username];
                return (
                  <List.Item
                    key={username}
                    title={username}
                    subtitle={`${target.type}: ${target.value}`}
                    accessories={username === currentUsername ? [{ tag: "you" }] : []}
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section>
                          <Action title="Edit" icon={Icon.Pencil} onAction={() => handleAddOrEdit(username, target)} />
                          <Action
                            title="Delete"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            onAction={() => handleDelete(username)}
                          />
                        </ActionPanel.Section>
                        {sharedActions}
                      </ActionPanel>
                    }
                  />
                );
              })
            ) : (
              <List.Item
                title="No Mappings Yet"
                subtitle="Add one for the current macOS user to get started"
                icon={Icon.Person}
                actions={<ActionPanel>{sharedActions}</ActionPanel>}
              />
            )}
          </List.Section>
        </>
      )}
    </List>
  );
}

function getCurrentUsername(): string | undefined {
  try {
    return userInfo().username || process.env.USER;
  } catch {
    return process.env.USER;
  }
}

// No Quicklink exists yet only when this session started fresh (source "new") and
// hasn't since loaded a real one via a pasted link — see `loadFromClipboard`.
function nextStepTitle(source: Source): string {
  return source === "new" ? "Create Quicklink" : "Copy Updated Link";
}

function sourceLabel(source: Source, hadDecodeError: boolean): string {
  const prefix = hadDecodeError ? "⚠️ Couldn't read the previous mapping — " : "";
  switch (source) {
    case "loading":
      return "Loading…";
    case "hotkey":
      return `${prefix}Loaded from hotkey`;
    case "clipboard":
      return `${prefix}Loaded from clipboard`;
    case "new":
      return `${prefix}New — no mapping found`;
  }
}
