import {
  Action,
  ActionPanel,
  Application,
  Clipboard,
  closeMainWindow,
  Color,
  environment,
  getFrontmostApplication,
  getPreferenceValues,
  getSelectedText,
  Icon,
  LaunchProps,
  List,
  popToRoot,
  showHUD,
  showToast,
  Toast,
  Keyboard,
  LocalStorage,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import { functions, aliases, convert, modifyTextWrapper, ModificationType } from "./modifications";

class NoTextError extends Error {
  constructor() {
    super("No text");
    Object.setPrototypeOf(this, NoTextError.prototype);
  }
}

async function getSelection() {
  try {
    return await getSelectedText();
  } catch {
    return "";
  }
}

async function readContent(preferredSource: string) {
  const clipboard = await Clipboard.readText();
  const selected = await getSelection();

  if (preferredSource === "clipboard") {
    if (clipboard) return clipboard;
    if (selected) return selected;
  } else {
    if (selected) return selected;
    if (clipboard) return clipboard;
  }

  throw new NoTextError();
}

const PINNED_STORAGE_KEY = "clean-text-pinned";
const RECENT_STORAGE_KEY = "clean-text-recent";

const getPinnedModifications = async (): Promise<ModificationType[]> => {
  try {
    const pinned = await LocalStorage.getItem<string>(PINNED_STORAGE_KEY);
    return pinned ? JSON.parse(pinned) : [];
  } catch {
    return [];
  }
};

const getRecentModifications = async (): Promise<ModificationType[]> => {
  try {
    const recent = await LocalStorage.getItem<string>(RECENT_STORAGE_KEY);
    return recent ? JSON.parse(recent) : [];
  } catch {
    return [];
  }
};

const setPinnedModifications = async (pinned: ModificationType[]) => {
  await LocalStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinned));
};

const setRecentModifications = async (recent: ModificationType[]) => {
  await LocalStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recent));
};

export default function Command(props: LaunchProps) {
  const preferences = getPreferenceValues<Preferences>();
  const preferredSource = preferences.source;
  const preferredAction = preferences.action;

  const applyModification = props.launchContext?.modification;
  if (applyModification) {
    (async () => {
      try {
        const content = await readContent(preferredSource);
        const modified = convert(content, applyModification);

        if (preferredAction === "paste") {
          Clipboard.paste(modified);
          Clipboard.copy(modified);
        } else {
          Clipboard.copy(modified);
        }

        showHUD(`Applied ${applyModification}`);
        popToRoot();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to apply modification",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    })();
    return;
  }

  const [content, setContent] = useState<string>("");
  const [frontmostApp, setFrontmostApp] = useState<Application>();

  const [pinned, setPinned] = useState<ModificationType[]>([]);
  const [recent, setRecent] = useState<ModificationType[]>([]);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  useEffect(() => {
    const loadFromCache = async () => {
      try {
        const pinnedFromCache = await getPinnedModifications();
        const recentFromCache = await getRecentModifications();

        setPinned(pinnedFromCache);
        setRecent(recentFromCache);
        setCacheLoaded(true);
      } catch {
        setCacheLoaded(true);
      }
    };

    loadFromCache();
    getFrontmostApplication().then(setFrontmostApp);
  }, []);

  useEffect(() => {
    if (cacheLoaded) {
      setPinnedModifications(pinned);
    }
  }, [pinned, cacheLoaded]);

  useEffect(() => {
    if (cacheLoaded) {
      setRecentModifications(recent);
    }
  }, [recent, cacheLoaded]);

  const refreshContent = async () => {
    try {
      setContent(await readContent(preferredSource));
    } catch (error) {
      if (error instanceof NoTextError) {
        showToast({
          style: Toast.Style.Failure,
          title: "Nothing to convert",
          message: "Ensure that text is either selected or copied",
        });
      }
    }
  };

  useEffect(() => {
    refreshContent();
  }, []);

  const CopyToClipboard = (props: {
    modification: ModificationType;
    modified: string;
    pinned?: boolean;
    recent?: boolean;
  }) => {
    return (
      <Action
        title="Copy to Clipboard"
        icon={Icon.Clipboard}
        onAction={() => {
          setRecent(
            [props.modification, ...recent.filter((c) => c !== props.modification)].slice(0, 4 + pinned.length),
          );
          showHUD("Copied to Clipboard");
          Clipboard.copy(props.modified);
          if (preferences.popToRoot) {
            popToRoot();
          } else {
            closeMainWindow();
          }
        }}
      />
    );
  };

  const PasteToActiveApp = (props: {
    modification: ModificationType;
    modified: string;
    pinned?: boolean;
    recent?: boolean;
  }) => {
    return frontmostApp ? (
      <Action
        title={`Paste in ${frontmostApp.name}`}
        icon={{ fileIcon: frontmostApp.path }}
        onAction={() => {
          setRecent(
            [props.modification, ...recent.filter((c) => c !== props.modification)].slice(0, 4 + pinned.length),
          );
          showHUD(`Pasted in ${frontmostApp.name}`);
          Clipboard.paste(props.modified);
          Clipboard.copy(props.modified);
          if (preferences.popToRoot) {
            popToRoot();
          } else {
            closeMainWindow();
          }
        }}
      />
    ) : null;
  };

  const ModificationItem = (props: {
    modification: ModificationType;
    modified: string;
    detail: string;
    pinned?: boolean;
    recent?: boolean;
  }) => {
    const context = encodeURIComponent(`{"modification":"${props.modification}"}`);
    const deeplink = `raycast://extensions/GenuineCheddar/${environment.extensionName}/${environment.commandName}?context=${context}`;

    return (
      <List.Item
        id={props.modification}
        title={props.modification}
        accessories={[{ text: props.modified }]}
        detail={<List.Item.Detail markdown={props.detail} />}
        keywords={aliases[props.modification]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {preferredAction === "paste" && <PasteToActiveApp {...props} />}
              <CopyToClipboard {...props} />
              {preferredAction === "copy" && <PasteToActiveApp {...props} />}
            </ActionPanel.Section>
            <ActionPanel.Section>
              {!props.pinned ? (
                <Action
                  title="Pin Modification"
                  icon={Icon.Pin}
                  shortcut={Keyboard.Shortcut.Common.Pin}
                  onAction={() => {
                    setPinned([props.modification, ...pinned]);
                    if (props.recent) {
                      setRecent(recent.filter((c) => c !== props.modification));
                    }
                  }}
                />
              ) : (
                <>
                  <Action
                    title="Remove from Pinned Modification"
                    icon={Icon.PinDisabled}
                    shortcut={Keyboard.Shortcut.Common.Pin}
                    onAction={() => {
                      setPinned(pinned.filter((c) => c !== props.modification));
                    }}
                  />
                  <Action
                    title="Clear All Pinned Modifications"
                    style={Action.Style.Destructive}
                    icon={{ source: Icon.XMarkCircle }}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    onAction={() => {
                      setPinned([]);
                    }}
                  />
                </>
              )}
              {props.recent && (
                <>
                  <Action
                    title="Remove Recent Modification"
                    icon={Icon.XMarkCircle}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => {
                      setRecent(recent.filter((c) => c !== props.modification));
                    }}
                  />
                  <Action
                    title="Clear Recent Modifications"
                    icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    onAction={() => {
                      setRecent([]);
                    }}
                  />
                </>
              )}
              <Action.CreateQuicklink
                title={`Create Quicklink to Apply ${props.modification}`}
                quicklink={{ name: `Apply ${props.modification}`, link: deeplink }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Refresh Content"
                icon={Icon.RotateAntiClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refreshContent}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isShowingDetail={true} isLoading={!cacheLoaded} selectedItemId={recent.length > 0 ? recent[0] : undefined}>
      <List.Section title="Pinned">
        {pinned?.map((key) => {
          const modified = modifyTextWrapper(content, key);
          return (
            <ModificationItem
              key={key}
              modification={key as ModificationType}
              modified={modified.rawText}
              detail={modified.markdown}
              pinned={true}
            />
          );
        })}
      </List.Section>
      <List.Section title="Recent">
        {recent
          .filter((key) => !pinned.includes(key))
          .map((key) => {
            const modified = modifyTextWrapper(content, key);
            return (
              <ModificationItem
                key={key}
                modification={key as ModificationType}
                modified={modified.rawText}
                detail={modified.markdown}
                recent={true}
              />
            );
          })}
      </List.Section>
      <List.Section title="All Modifications">
        {Object.keys(functions)
          .filter((key) => !recent.includes(key as ModificationType) && !pinned.includes(key as ModificationType))
          .map((key) => {
            const modified = modifyTextWrapper(content, key);
            return (
              <ModificationItem
                key={key}
                modification={key as ModificationType}
                modified={modified.rawText}
                detail={modified.markdown}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
