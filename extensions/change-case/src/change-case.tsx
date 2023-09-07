import {
  ActionPanel,
  List,
  getPreferenceValues,
  getSelectedText,
  Action,
  Icon,
  Color,
  Clipboard,
  showHUD,
  closeMainWindow,
  showToast,
  Toast,
  Cache,
  Application,
  getFrontmostApplication,
  environment,
  LaunchProps,
  popToRoot
} from "@raycast/api";
import * as changeCase from "change-case-all";
import { useEffect, useState } from "react";
const cases = [
  "Camel Case",
  "Capital Case",
  "Constant Case",
  "Dot Case",
  "Header Case",
  "Kebab Case",
  "Lower Case",
  "Lower First",
  "Macro Case",
  "No Case",
  "Param Case",
  "Pascal Case",
  "Path Case",
  "Random Case",
  "Sentence Case",
  "Slug Case",
  "Snake Case",
  "Swap Case",
  "Title Case",
  "Upper Case",
  "Upper First",
  "Sponge Case",
] as const;

type CaseType = (typeof cases)[number];
type Cases = { [key: string]: (input: string, options?: object) => string };

class NoTextError extends Error {
  constructor() {
    super("No text");
    Object.setPrototypeOf(this, NoTextError.prototype);
  }
}

async function getSelection() {
  try {
    return await getSelectedText();
  } catch (error) {
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

const functions: Cases = {
  "Camel Case": changeCase.camelCase,
  "Capital Case": changeCase.capitalCase,
  "Constant Case": changeCase.constantCase,
  "Dot Case": changeCase.dotCase,
  "Header Case": changeCase.headerCase,
  "Kebab Case": changeCase.paramCase,
  "Lower Case": changeCase.lowerCase,
  "Lower First": changeCase.lowerCaseFirst,
  "Macro Case": changeCase.constantCase,
  "No Case": changeCase.noCase,
  "Param Case": changeCase.paramCase,
  "Pascal Case": changeCase.pascalCase,
  "Path Case": changeCase.pathCase,
  "Random Case": changeCase.spongeCase,
  "Sentence Case": changeCase.sentenceCase,
  "Slug Case": changeCase.paramCase,
  "Snake Case": changeCase.snakeCase,
  "Swap Case": changeCase.swapCase,
  "Title Case": changeCase.titleCase,
  "Upper Case": changeCase.upperCase,
  "Upper First": changeCase.upperCaseFirst,
  "Sponge Case": changeCase.spongeCase,
};

export default function Command(props: LaunchProps) {
  const preferences = getPreferenceValues();
  const preferredSource = preferences["source"];

  const immediatelyConvertToCase = props.launchContext?.case;
  if (immediatelyConvertToCase) {
    (async () => {
      let content = await readContent(preferredSource);
      let converted = functions[immediatelyConvertToCase](content);

      Clipboard.copy(converted);

      showHUD(`Converted to ${immediatelyConvertToCase}`);
      popToRoot();
    })();
    return;
  }

  const [clipboard, setClipboard] = useState<string>("");
  const [frontmostApp, setFrontmostApp] = useState<Application>();

  const [pinned, setPinned] = useState<CaseType[]>([]);
  const [recent, setRecent] = useState<CaseType[]>([]);


  useEffect(() => {
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
    readContent(preferredSource)
      .then((c) => setClipboard(c))
      .catch((error) => {
        if (error instanceof NoTextError) {
          showToast({
            style: Toast.Style.Failure,
            title: "Nothing to convert",
            message: "Please ensure that text is either selected or copied",
          });
        }
      });
  }, [preferredSource]);

  const CopyToClipboard = (props: {
    case: CaseType;
    modified: string;
    pinned?: boolean;
    recent?: boolean;
  }): JSX.Element => {
    return (
      <Action
        title="Copy to Clipboard"
        icon={Icon.Clipboard}
        onAction={() => {
          if (!props.pinned) {
            setRecent([props.case, ...recent.filter((c) => c !== props.case)].slice(0, 4));
          }
          showHUD("Copied to Clipboard");
          Clipboard.copy(props.modified);
          closeMainWindow();
        }}
      />
    );
  };

  const PasteToActiveApp = (props: {
    case: CaseType;
    modified: string;
    pinned?: boolean;
    recent?: boolean;
  }): JSX.Element | null => {
    return frontmostApp ? (
      <Action
        title={`Paste in ${frontmostApp.name}`}
        icon={{ fileIcon: frontmostApp.path }}
        onAction={() => {
          if (!props.pinned) {
            setRecent([props.case, ...recent.filter((c) => c !== props.case)].slice(0, 4));
          }
          showHUD(`Pasted in ${frontmostApp.name}`);
          Clipboard.paste(props.modified);
          closeMainWindow();
        }}
      />
    ) : null;
  };

  const CaseItem = (props: { case: CaseType; modified: string; pinned?: boolean; recent?: boolean }): JSX.Element => {
    const context = encodeURIComponent(`{"case":"${props.case}"}`);
    const deeplink = `raycast://extensions/erics118/${environment.extensionName}/${environment.commandName}?context=${context}`;

    return (
      <List.Item
        id={props.case}
        title={props.case}
        accessories={[{ text: props.modified }]}
        detail={<List.Item.Detail markdown={props.modified} />}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {preferences["action"] === "paste" && <PasteToActiveApp {...props} />}
              <CopyToClipboard {...props} />
              {preferences["action"] === "copy" && <PasteToActiveApp {...props} />}
            </ActionPanel.Section>
            <ActionPanel.Section>
              {!props.pinned ? (
                <Action
                  title="Pin Case"
                  icon={Icon.Pin}
                  shortcut={{ key: "p", modifiers: ["cmd"] }}
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
                    shortcut={{ key: "r", modifiers: ["cmd"] }}
                    onAction={() => {
                      setPinned(pinned.filter((c) => c !== props.case));
                    }}
                  />
                  <Action
                    title="Clear Pinned Cases"
                    icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                    shortcut={{ key: "r", modifiers: ["cmd", "shift"] }}
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
                    shortcut={{ key: "r", modifiers: ["cmd"] }}
                    onAction={() => {
                      setRecent(recent.filter((c) => c !== props.case));
                    }}
                  />
                  <Action
                    title="Clear Recent Cases"
                    icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                    shortcut={{ key: "r", modifiers: ["cmd", "shift"] }}
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
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isShowingDetail={true}>
      <List.Section title="Pinned">
        {pinned?.map((key) => (
          <CaseItem key={key} case={key as CaseType} modified={functions[key](clipboard)} pinned={true} />
        ))}
      </List.Section>
      <List.Section title="Recent">
        {recent.map((key) => (
          <CaseItem key={key} case={key as CaseType} modified={functions[key](clipboard)} recent={true} />
        ))}
      </List.Section>
      <List.Section title="All Cases">
        {Object.entries(functions)
          .filter(
            ([key, _]) =>
              preferences[key.replace(/ +/g, "")] &&
              !recent.includes(key as CaseType) &&
              !pinned.includes(key as CaseType)
          )
          .map(([key, func]) => (
            <CaseItem key={key} case={key as CaseType} modified={func(clipboard)} />
          ))}
      </List.Section>
    </List>
  );
}
