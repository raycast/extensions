import {
  Action,
  ActionPanel,
  Application,
  Cache,
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
  clearSearchBar,
} from "@raycast/api";
import { JSX, useCallback, useEffect, useMemo, useState } from "react";
import { CaseType, aliases, convert, functions, modifyCasesWrapper } from "./cases.js";

const MAX_RECENT_CASES = 4;

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

const cache = new Cache();

const getPinnedCases = (): CaseType[] => {
  const pinned = cache.get("pinned");
  return pinned ? JSON.parse(pinned) : [];
};

const getRecentCases = (): CaseType[] => {
  const recent = cache.get("recent");
  return recent ? JSON.parse(recent) : [];
};

const setPinnedCases = (pinned: CaseType[]) => {
  cache.set("pinned", JSON.stringify(pinned));
};

const setRecentCases = (recent: CaseType[]) => {
  cache.set("recent", JSON.stringify(recent));
};

export default function Command(props: LaunchProps) {
  const preferences = getPreferenceValues<Preferences>();
  const preferredSource = preferences.source;
  const preferredAction = preferences.action;
  const hideHUD = preferences.hideHUD;

  const immediatelyConvertToCase = props.launchContext?.case;

  const [content, setContent] = useState<string>("");
  const [frontmostApp, setFrontmostApp] = useState<Application>();
  const [pinned, setPinned] = useState<CaseType[]>([]);
  const [recent, setRecent] = useState<CaseType[]>([]);
  useEffect(() => {
    if (immediatelyConvertToCase) {
      (async () => {
        try {
          const content = await readContent(preferredSource);
          const modified = convert(content, immediatelyConvertToCase);

          if (preferredAction === "paste") {
            Clipboard.paste(modified);
          } else {
            Clipboard.copy(modified);
          }

          if (!hideHUD) {
            showHUD(`Converted to ${immediatelyConvertToCase}`);
          }
        } catch (error) {
          if (error instanceof NoTextError) {
            showToast({
              style: Toast.Style.Failure,
              title: "No text available",
              message: "Please ensure that text is either selected or copied",
            });
          } else {
            showToast({
              style: Toast.Style.Failure,
              title: "Failed to convert text",
            });
          }
        }
        popToRoot();
      })();
      return;
    }

    setPinned(getPinnedCases());
    setRecent(getRecentCases());
    getFrontmostApplication().then(setFrontmostApp);
  }, []);

  useEffect(() => {
    setPinnedCases(pinned);
  }, [pinned]);

  useEffect(() => {
    setRecentCases(recent);
  }, [recent]);

  useEffect(() => {
    if (props.fallbackText) clearSearchBar();
  }, []);

  const refreshContent = async () => {
    try {
      setContent(props.fallbackText || (await readContent(preferredSource)));
    } catch (error) {
      if (error instanceof NoTextError) {
        showToast({
          style: Toast.Style.Failure,
          title: "Nothing to convert",
          message: "Please ensure that text is either selected or copied",
        });
      }
    }
  };

  useEffect(() => {
    if (!immediatelyConvertToCase) {
      refreshContent();
    }
  }, []);

  const handleAction = useCallback(
    (caseType: CaseType, modified: string, hudMessage: string, action: "copy" | "paste") => {
      setRecent([caseType, ...recent.filter((c) => c !== caseType)].slice(0, MAX_RECENT_CASES + pinned.length));
      if (!hideHUD) showHUD(hudMessage);
      if (action === "paste") {
        Clipboard.paste(modified);
      } else {
        Clipboard.copy(modified);
      }
      if (preferences.popToRoot) {
        popToRoot();
      } else {
        closeMainWindow();
      }
    },
    [recent, pinned.length, hideHUD, preferences.popToRoot],
  );

  const conversions = useMemo(() => {
    const allCases = [...new Set([...pinned, ...recent, ...Object.keys(functions)])];
    return Object.fromEntries(
      allCases.filter((key) => functions[key]).map((key) => [key, modifyCasesWrapper(content, key)]),
    );
  }, [content, pinned, recent]);

  if (immediatelyConvertToCase) {
    return null;
  }

  const CopyToClipboard = (props: { case: CaseType; modified: string }): JSX.Element => (
    <Action
      title="Copy to Clipboard"
      icon={Icon.Clipboard}
      shortcut={Keyboard.Shortcut.Common.Copy}
      onAction={() => handleAction(props.case, props.modified, "Copied to Clipboard", "copy")}
    />
  );

  const PasteToActiveApp = (props: { case: CaseType; modified: string }): JSX.Element | null =>
    frontmostApp ? (
      <Action
        title={`Paste in ${frontmostApp.name}`}
        icon={{ fileIcon: frontmostApp.path }}
        onAction={() => handleAction(props.case, props.modified, `Pasted in ${frontmostApp.name}`, "paste")}
      />
    ) : null;

  const CaseItem = (props: {
    case: CaseType;
    modified: string;
    detail: string;
    pinned?: boolean;
    recent?: boolean;
  }): JSX.Element => {
    const context = encodeURIComponent(`{"case":"${props.case}"}`);
    const deeplink = `raycast://extensions/erics118/${environment.extensionName}/${environment.commandName}?context=${context}`;

    return (
      <List.Item
        id={props.case}
        title={props.case}
        accessories={[{ text: props.modified }]}
        detail={<List.Item.Detail markdown={props.detail} />}
        keywords={aliases[props.case]}
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
                  title="Pin Case"
                  icon={Icon.Pin}
                  shortcut={Keyboard.Shortcut.Common.Pin}
                  onAction={() => {
                    setPinned([props.case, ...pinned]);
                    if (props.recent) {
                      setRecent(recent.filter((c) => c !== props.case));
                    }
                  }}
                />
              ) : (
                <>
                  <Action
                    title="Remove Pinned Case"
                    icon={Icon.PinDisabled}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => {
                      setPinned(pinned.filter((c) => c !== props.case));
                    }}
                  />
                  <Action
                    title="Clear Pinned Cases"
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
                    title="Remove Recent Case"
                    icon={Icon.XMarkCircle}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => {
                      setRecent(recent.filter((c) => c !== props.case));
                    }}
                  />
                  <Action
                    title="Clear Recent Cases"
                    icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    onAction={() => {
                      setRecent([]);
                    }}
                  />
                </>
              )}
              <Action.CreateQuicklink
                title={`Create Quicklink to Convert to ${props.case}`}
                quicklink={{ name: `Convert to ${props.case}`, link: deeplink }}
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
    <List isShowingDetail={true} isLoading={!pinned || !recent} selectedItemId={recent[0]}>
      <List.Section title="Pinned">
        {pinned
          ?.filter((key) => conversions[key])
          .map((key) => {
            const modified = conversions[key];
            return (
              <CaseItem
                key={key}
                case={key as CaseType}
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
            const modified = conversions[key];
            return (
              <CaseItem
                key={key}
                case={key as CaseType}
                modified={modified.rawText}
                detail={modified.markdown}
                recent={true}
              />
            );
          })}
      </List.Section>
      <List.Section title="All Cases">
        {Object.keys(functions)
          .filter(
            (key) =>
              preferences[key.replace(/ +/g, "") as keyof ExtensionPreferences] &&
              !recent.includes(key as CaseType) &&
              !pinned.includes(key as CaseType),
          )
          .map((key) => {
            const modified = conversions[key];
            return <CaseItem key={key} case={key as CaseType} modified={modified.rawText} detail={modified.markdown} />;
          })}
      </List.Section>
    </List>
  );
}
