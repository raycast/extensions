import {
  Action,
  AI,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import { showFailureToast, useCachedState, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { Ask } from "./components/ask";
import { copyError } from "./lib/copy-error";
import { useSelectionDetail } from "./hooks/use-selection-detail";
import { SearchModels } from "./components/search-models";
import { ServerDownEmptyView } from "./components/server-down";
import { handleLoadError, openInOsaurus, OSAURUS_MODELS_URL, syncRaycastModels } from "./lib/server-toast";
import { HttpError, listModels, quitApp, serverApp, ServerDownError, showModel } from "./lib/osaurus";

async function refreshRaycastModelsNow() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing Raycast AI models…" });
  try {
    await AI.refreshModels();
    toast.style = Toast.Style.Success;
    toast.title = "Raycast AI models refreshed";
  } catch (error) {
    logger.error("AI.refreshModels failed", error);
    await showFailureToast(error, { title: "Couldn't refresh Raycast AI models", primaryAction: copyError(error) });
  }
}

export default function Command() {
  const [selected, setSelected] = useState<string | null>(null);
  const reload = useRef<() => void>(undefined);
  const {
    data: models,
    isLoading,
    error,
    revalidate,
  } = usePromise(listModels, [], {
    onError: handleLoadError(reload),
    onData: (list) =>
      syncRaycastModels(
        "manage",
        list.map((m) => m.id),
      ),
  });
  reload.current = revalidate;
  const { value: shown, error: detailsError, isLoading: isLoadingDetails } = useSelectionDetail(selected, showModel);
  const serverDown = error instanceof ServerDownError;

  // Ask Osaurus opens on this. Its own dropdown doesn't change it.
  const [defaultModel, setDefaultModel] = useCachedState<string>("default-model", "");
  // Hiding is Raycast-side only: Osaurus has no delete API, and some models (its memory's embedding
  // model) must stay installed anyway.
  const [hidden, setHidden] = useCachedState<string[]>("hidden-models", []);
  const [showHidden, setShowHidden] = useState(false);
  const [showDetail, setShowDetail] = useCachedState<boolean>("show-detail-models", true);
  const visible = models?.filter((m) => showHidden || !hidden.includes(m.id));
  const hiddenToggle = hidden.length > 0 && (
    <Action
      title={showHidden ? "Hide Hidden Models" : `Show Hidden Models (${hidden.length})`}
      icon={showHidden ? Icon.EyeDisabled : Icon.Eye}
      shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
      onAction={() => setShowHidden((v) => !v)}
    />
  );

  async function quitOsaurus() {
    const app = await serverApp();
    if (!app) {
      const title = "Couldn't find the Osaurus app that's serving";
      await showToast({ style: Toast.Style.Failure, title, primaryAction: copyError(title) });
      return;
    }
    const confirmed = await confirmAlert({
      title: "Quit Osaurus?",
      message: "Its server stops, and apps using Osaurus models lose their connection.",
      primaryAction: { title: "Quit Osaurus", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Quitting Osaurus…" });
    try {
      await quitApp(app);
      toast.style = Toast.Style.Success;
      toast.title = "Osaurus quit";
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't quit Osaurus", primaryAction: copyError(error) });
    }
  }

  const serverActions = (
    <ActionPanel.Section title="Server">
      <Action.Push
        title="Search Models"
        icon={Icon.MagnifyingGlass}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<SearchModels />}
      />
      <Action
        title="Manage Models in Osaurus"
        icon={Icon.AppWindowSidebarLeft}
        shortcut={Keyboard.Shortcut.Common.Open}
        onAction={() => openInOsaurus(OSAURUS_MODELS_URL)}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      <Action title="Refresh Raycast AI Models" icon={Icon.Stars} onAction={refreshRaycastModelsNow} />
      {/* Destructive, so last. With the server down the empty view offers Open Osaurus instead. */}
      {!serverDown && (
        <Action title="Quit Osaurus" icon={Icon.Stop} style={Action.Style.Destructive} onAction={quitOsaurus} />
      )}
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!!models?.length && showDetail}
      onSelectionChange={setSelected}
      searchBarPlaceholder="Filter models…"
    >
      {serverDown ? (
        <ServerDownEmptyView onReady={revalidate} actions={serverActions} />
      ) : error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't load models"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              {serverActions}
            </ActionPanel>
          }
        />
      ) : models?.length ? (
        <List.EmptyView
          icon={Icon.EyeDisabled}
          title="All your models are hidden"
          description="Press ⌘⇧H to show them."
          actions={
            <ActionPanel>
              {hiddenToggle}
              {serverActions}
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.ComputerChip}
          title="No models yet"
          description="Search for one with ⌘N and add it to Osaurus."
          actions={<ActionPanel>{serverActions}</ActionPanel>}
        />
      )}
      {visible?.map((m) => (
        <List.Item
          key={m.id}
          id={m.id}
          title={m.id}
          // Icons, not tags: a text tag squeezes long model ids into truncation.
          accessories={[
            ...(m.id === defaultModel ? [{ icon: Icon.StarCircle, tooltip: "Default Ask model" }] : []),
            ...(hidden.includes(m.id) ? [{ icon: Icon.EyeDisabled, tooltip: "Hidden" }] : []),
          ]}
          icon={Icon.ComputerChip}
          detail={
            <List.Item.Detail
              isLoading={isLoadingDetails}
              markdown={
                selected !== m.id
                  ? undefined
                  : detailsError
                    ? /^potion-base-4m$/i.test(m.id)
                      ? "Osaurus's built-in embedding model. Its memory feature uses it to index what it remembers, so it can't answer questions and shouldn't be deleted. Choose Hide Model in Actions (⌘K) to take it off this list."
                      : detailsError instanceof HttpError && detailsError.status === 404
                        ? "Osaurus lists this model but can't find its files. It may be an embedding model, or it was deleted from disk."
                        : "Couldn't load details for this model."
                    : undefined
              }
              metadata={
                <List.Item.Detail.Metadata>
                  {/* Only what Osaurus reports: built-in models such as Apple's on-device
                      Foundation Model leave size, quantization and context empty. */}
                  {[
                    ["Name", shown?.name],
                    ["Family", m.family],
                    ["Format", m.format],
                    ["Parameters", m.parameterSize],
                    ["Quantization", m.quantization],
                    ["Context", shown?.contextLength ? `${shown.contextLength.toLocaleString()} tokens` : undefined],
                  ]
                    .filter((row): row is [string, string] => !!row[1])
                    .map(([title, text]) => (
                      <List.Item.Detail.Metadata.Label key={title} title={title} text={text} />
                    ))}
                  {shown?.capabilities.length ? (
                    <List.Item.Detail.Metadata.TagList title="Capabilities">
                      {shown.capabilities.map((c) => (
                        <List.Item.Detail.Metadata.TagList.Item key={c} text={c} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  ) : null}
                  {shown?.parameters && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      {parseParameters(shown.parameters).map(([key, value]) => (
                        <List.Item.Detail.Metadata.Label key={key} title={key} text={value} />
                      ))}
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {/* Only models that can chat; the details lookup says which. */}
                {m.id === selected && shown?.capabilities.includes("completion") && (
                  <>
                    <Action.Push title="Ask This Model" icon={Icon.Stars} target={<Ask initialModel={m.id} />} />
                    {m.id !== defaultModel && (
                      <Action
                        title="Set as Default Ask Model"
                        icon={Icon.StarCircle}
                        onAction={async () => {
                          setDefaultModel(m.id);
                          // Short title: long model ids get cut off in a toast, so the id goes in the message.
                          await showToast({ style: Toast.Style.Success, title: "Default model set", message: m.id });
                        }}
                      />
                    )}
                  </>
                )}
                <Action.CopyToClipboard title="Copy Model ID" content={m.id} shortcut={Keyboard.Shortcut.Common.Copy} />
              </ActionPanel.Section>
              <ActionPanel.Section title="Visibility">
                {hidden.includes(m.id) ? (
                  <Action
                    title="Unhide Model"
                    icon={Icon.Eye}
                    onAction={() => setHidden((prev) => prev.filter((id) => id !== m.id))}
                  />
                ) : (
                  <Action
                    title="Hide Model"
                    icon={Icon.EyeDisabled}
                    onAction={async () => {
                      setHidden((prev) => [...prev, m.id]);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Model hidden",
                        message: "⌘⇧H shows it again",
                      });
                    }}
                  />
                )}
                {hiddenToggle}
                <Action
                  title={showDetail ? "Hide Sidebar" : "Show Sidebar"}
                  icon={Icon.AppWindowSidebarRight}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "d" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "d" },
                  }}
                  onAction={() => setShowDetail((v) => !v)}
                />
              </ActionPanel.Section>
              {serverActions}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Osaurus returns default sampling parameters as "name value" lines (Ollama's format), e.g.
// "top_p 0.95". Shown as metadata rows: "Top P" / "0.95".
function parseParameters(text: string): [string, string][] {
  return text
    .split("\n")
    .map((line) => line.trim().match(/^(\S+)\s+(.+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map(([, key, value]) => [
      key
        .split("_")
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" "),
      value,
    ]);
}
