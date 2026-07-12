import { useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  getSelectedText,
  Icon,
  List,
  openExtensionPreferences,
  PopToRootType,
} from "@raycast/api";
import { rewriteText, type RewriteOptions } from "./providers";
import {
  loadModeSettings,
  markModeUsed,
  sortModes,
  type EditingMode,
} from "./modes";
import { getRewriteViewState } from "./rewrite-state";
import { getUiStrings } from "./i18n";
import { getProviderDefinition } from "./provider-registry";

const MAX_TEXT_LENGTH = 20_000;
const REQUEST_TIMEOUT_MS = 60_000;
export default function Command() {
  const [selectedTextPromise] = useState(() => getSelectedText());
  const [text, setText] = useState<string>();
  const [modes, setModes] = useState<EditingMode[]>([]);
  const [sortMode, setSortMode] = useState<"custom" | "last-used">("custom");
  const [error, setError] = useState<string>();
  const [isTextLoading, setIsTextLoading] = useState(true);
  const [isModesLoading, setIsModesLoading] = useState(true);
  const [isRewriting, setIsRewriting] = useState(false);
  const abortRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    selectedTextPromise
      .then((value) => {
        if (!value.trim()) throw new Error(getUiStrings().selectionMissing);
        setText(value);
      })
      .catch((reason) => setError(String(reason)))
      .finally(() => setIsTextLoading(false));
  }, [selectedTextPromise]);

  useEffect(() => {
    async function loadSavedModes() {
      try {
        const { modes, sortMode } = await loadModeSettings();
        setModes(modes);
        setSortMode(sortMode);
      } catch (reason) {
        setError(String(reason));
      } finally {
        setIsModesLoading(false);
      }
    }
    void loadSavedModes();
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const viewState = getRewriteViewState({
    textLoading: isTextLoading,
    modesLoading: isModesLoading,
    modes,
    error,
  });
  const sortedModes = sortModes(modes, sortMode);
  const ui = getUiStrings();

  async function rewrite(mode: EditingMode) {
    if (!text || viewState !== "ready") return;
    if (text.length > MAX_TEXT_LENGTH) {
      setError(ui.selectedTextTooLong(text.length, MAX_TEXT_LENGTH));
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    setIsRewriting(true);
    setError(undefined);
    try {
      const preferences = getPreferenceValues<Preferences.Index>();
      const provider = getProviderDefinition(mode.provider);
      if (!provider) throw new Error(`Unknown provider: ${mode.provider}`);
      const apiKey = provider.credentialKey
        ? preferences[provider.credentialKey]
        : undefined;
      if (provider.location === "cloud" && !apiKey)
        throw new Error(ui.configureApiKey);
      const options: RewriteOptions = {
        text,
        mode,
        apiKey,
        ollamaUrl: preferences.ollamaUrl,
      };
      const result = await rewriteText(options, controller.signal);
      if (controller.signal.aborted) return;

      const usedMode = await markModeUsed(mode.id, new Date().toISOString());
      setModes((currentModes) =>
        currentModes.map((currentMode) =>
          currentMode.id === usedMode.id ? usedMode : currentMode,
        ),
      );

      await Clipboard.copy(result);
      await closeMainWindow({
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
      await Clipboard.paste(result);
    } catch (reason) {
      setError(
        controller.signal.aborted ? ui.rewriteCancelled : String(reason),
      );
    } finally {
      clearTimeout(timeoutId);
      if (abortRef.current === controller) abortRef.current = undefined;
      setIsRewriting(false);
    }
  }

  function cancelRewrite() {
    abortRef.current?.abort();
  }
  if (viewState === "error")
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={ui.rewriteFailed}
          description={error}
          actions={
            <ActionPanel>
              <Action
                title={ui.openSettings}
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  if (viewState === "empty")
    return (
      <List navigationTitle={ui.rewriteSelectedText}>
        <List.EmptyView
          icon={Icon.Text}
          title={ui.noModes}
          description={ui.noModesDescription}
          actions={
            <ActionPanel>
              <Action
                title={ui.openSettings}
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  return (
    <List
      isLoading={viewState === "loading" || isRewriting}
      navigationTitle={ui.rewriteSelectedText}
    >
      {viewState === "ready"
        ? sortedModes.map((mode) => (
            <List.Item
              key={mode.id}
              icon={Icon.Text}
              title={mode.title}
              subtitle={mode.description}
              actions={
                <ActionPanel>
                  {isRewriting ? (
                    <Action
                      title={ui.cancel}
                      icon={Icon.XMarkCircle}
                      onAction={cancelRewrite}
                    />
                  ) : (
                    <Action
                      title={ui.rewrite}
                      icon={Icon.Wand}
                      onAction={() => rewrite(mode)}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))
        : null}
    </List>
  );
}
