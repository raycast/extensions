import { useState } from "react";
import {
  List,
  ActionPanel,
  Action as RaycastAction,
  Clipboard,
  LaunchProps,
  Icon,
  Action,
  Color,
  closeMainWindow,
  getPreferenceValues,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import pinsManager from "./pinsManager";
import promptManager, { PromptProps } from "./promptManager";
import { contentFormat } from "./contentFormat";
import fs from "fs";
import path from "path";
import { match } from "pinyin-pro";
import useClipboardAndSelectionText from "./useClipboardAndSelectionText";
import React from "react";

const IDENTIFIER_PREFIX = "quickgpt-";
const DEFAULT_ICON = "🔖";

const supportedPrefixCMD: { [key: string]: string } = {
  c: "简体中文作答",
  ne: "NO EXPLANATION",
  np: "Do not use plugins and data analysis",
  cot: "Take a deep breath and work on this problem step-by-step",
};

const defaultPrefixCMD = ["c", "cot"];

function processActionPrefixCMD(content: string, actionPrefixCMD: string | undefined) {
  let currentPrefixCMD = defaultPrefixCMD.slice();
  const actionPrefixes = actionPrefixCMD?.split(",");
  actionPrefixes?.forEach((cmd) => {
    cmd.startsWith("!")
      ? (currentPrefixCMD = currentPrefixCMD.filter((c) => c !== cmd.substring(1)))
      : currentPrefixCMD.push(cmd);
  });
  currentPrefixCMD = [...new Set(currentPrefixCMD)];

  currentPrefixCMD.reverse().forEach((cmd) => {
    content = `! ${supportedPrefixCMD[cmd]}\n` + content;
  });

  return content;
}

function findQuickPrompt(selectionText: string, identifier?: string): [PromptProps | undefined, string] {
  let foundAction;
  let cleanedText = selectionText;

  if (identifier) {
    foundAction = promptManager.findPrompt((action) => `${IDENTIFIER_PREFIX}${action.identifier}` === identifier);
  } else {
    foundAction = promptManager.findPrompt(
      (action) => (action.identifier && selectionText.includes(IDENTIFIER_PREFIX + action.identifier)) || false
    );
    if (foundAction?.identifier) {
      cleanedText = selectionText
        .split(IDENTIFIER_PREFIX + foundAction.identifier)
        .slice(1)
        .join("")
        .trim();
    }
  }

  return [foundAction, cleanedText];
}

function getPromptActions(formattedDescription: string) {
  const preferences = getPreferenceValues<Preferences>();
  const createRaycastOpenInBrowser = (
    title: string | undefined,
    url: string,
    formattedDescription: string | number | Clipboard.Content
  ) => <RaycastAction.OpenInBrowser title={title} url={url} onOpen={() => Clipboard.copy(formattedDescription)} />;

  const action = [
    {
      name: "openURL",
      condition: preferences.openURL,
      action: createRaycastOpenInBrowser("Open URL", preferences.openURL ?? "", formattedDescription),
    },
    ...[
      path.join(__dirname, "assets/ChatGPT.applescript"),
      preferences.runScript1,
      preferences.runScript2,
      preferences.runScript3,
      preferences.runScript4,
      preferences.runScript5,
      preferences.runScript6,
      preferences.runScript7,
      preferences.runScript8,
      preferences.runScript9,
    ].map((script, index) => {
      return {
        name: `runScript${index}`,
        condition: script,
        action: (
          <Action
            title={`Run ${path.basename(script ?? "", path.extname(script ?? ""))}`}
            key={`runScript${index + 1}`}
            icon={Icon.Terminal}
            onAction={() => {
              closeMainWindow();
              Clipboard.copy(formattedDescription);
              const myScript = fs.readFileSync(script ?? "", "utf8");
              runAppleScript(myScript);
            }}
          />
        ),
      };
    }),
    {
      name: "copyToClipboard",
      condition: true,
      action: (
        <RaycastAction.CopyToClipboard
          title="Copy"
          content={formattedDescription}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      ),
    },
  ];

  return (
    <>
      {action
        .sort((a, b) =>
          a.name == preferences.primaryAction ||
          (a.name == preferences.secondaryAction && b.name != preferences.primaryAction)
            ? -1
            : 0
        )
        .map((option, index) => option.condition && React.cloneElement(option.action, { key: index }))}
    </>
  );
}

function PromptList({
  prompts: prompts,
  searchMode = false,
  clipboardText = "",
  selectionText = "",
}: {
  prompts: PromptProps[];
  searchMode: boolean;
  clipboardText: string;
  selectionText: string;
}) {
  const [searchText, setSearchText] = useState<string>("");

  if (searchMode && searchText.length > 0) {
    prompts = promptManager.getFilteredPrompts((prompt) => {
      return (
        prompt.title.toLowerCase().includes(searchText.toLowerCase()) ||
        match(prompt.title, searchText, { continuous: true })
      );
    });
  }

  const [, forceUpdate] = useState(0);
  const activeSearchText = searchMode ? "" : searchText;
  const replacements = { query: activeSearchText, clipboard: clipboardText, selection: selectionText };
  const promptItems = prompts
    .sort((a, b) => Number(b.pinned) - Number(a.pinned))
    .map((prompt) => {
      const content = prompt.content ? processActionPrefixCMD(prompt.content, prompt.prefixCMD) : undefined;
      const [formattedTitle, missingTitleTags] = contentFormat(prompt.title || "", replacements);
      const [formattedDescription, missingDescriptionTags] = contentFormat(content || "", replacements);

      const missingPlaceholders = [...new Set([...missingTitleTags, ...missingDescriptionTags])].join(", ");

      const isSubtitleMissingTags = missingPlaceholders.length > 0;
      const subtitle = isSubtitleMissingTags ? `missing Placeholders: ${missingPlaceholders}` : undefined;

      const promptTitle = isSubtitleMissingTags ? prompt.title : formattedTitle;

      if (
        activeSearchText &&
        formattedTitle == prompt.title &&
        prompt.title.toLowerCase().indexOf(activeSearchText.toLowerCase()) == -1 &&
        !match(prompt.title, activeSearchText, { continuous: true })
      ) {
        return null;
      }

      return (
        <List.Item
          key={promptTitle}
          title={promptTitle.replace(/\n/g, " ")}
          icon={prompt.icon ?? DEFAULT_ICON}
          subtitle={subtitle}
          accessories={[
            prompt.pinned ? { tag: { value: "PIN", color: Color.SecondaryText } } : {},
            {
              icon: prompt.subprompts ? Icon.Folder : Icon.Paragraph,
              tooltip:
                prompt.content ??
                prompt.subprompts?.map((subaction, index) => `${index + 1}. ${subaction.title} `).join("\n"),
            },
          ]}
          actions={
            <ActionPanel>
              {prompt.subprompts && (
                <RaycastAction.Push
                  title={promptTitle}
                  icon={prompt.icon ?? DEFAULT_ICON}
                  target={
                    <PromptList
                      searchMode={false}
                      prompts={prompt.subprompts}
                      clipboardText={clipboardText}
                      selectionText={selectionText}
                    />
                  }
                />
              )}
              {getPromptActions(formattedDescription)}
              {
                <Action
                  title={prompt.pinned ? "Unpin" : "Pin"}
                  icon={Icon.Pin}
                  onAction={() => {
                    prompt.pinned = !prompt.pinned;
                    prompt.pinned ? pinsManager.pin(prompt.identifier) : pinsManager.unpin(prompt.identifier);
                    forceUpdate((n) => n + 1);
                  }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                />
              }
              {
                <>
                  <RaycastAction.CopyToClipboard
                    title="Copy Identifier"
                    content={IDENTIFIER_PREFIX + prompt.identifier}
                    icon={Icon.Document}
                  />
                  <RaycastAction.CopyToClipboard
                    title="Copy Deeplink"
                    content={`raycast://extensions/ddhjy2012/quickgpt/index?arguments=${encodeURIComponent(
                      JSON.stringify({ target: IDENTIFIER_PREFIX + prompt.identifier })
                    )}`}
                    icon={Icon.Link}
                  />
                </>
              }
            </ActionPanel>
          }
        />
      );
    });

  return (
    <List onSearchTextChange={setSearchText} filtering={false}>
      {promptItems}
    </List>
  );
}

export default function MainCommand(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const {
    selectionText: argumentSelectionText,
    clipboardText: argumentClipboardText,
    target: target,
  } = props.arguments;
  const { clipboardText: currentClipboardText, selectionText: currentSelectionText } = useClipboardAndSelectionText();
  const clipboardText = argumentClipboardText ?? currentClipboardText;
  const selectionText = argumentSelectionText ?? currentSelectionText;

  const pinnedIdentifiers = pinsManager.pinnedIdentifiers();
  const pinnedActions = promptManager.getFilteredPrompts((action) => {
    action.pinned = pinnedIdentifiers.has(action.identifier);
    return action.pinned;
  });

  const [quickAction, cleanSelectionText] = findQuickPrompt(selectionText, target);
  const actionsForUse = quickAction ? [quickAction] : [...pinnedActions, ...promptManager.getRootPrompts()];
  const selectionTextForUse = quickAction ? cleanSelectionText : selectionText;

  const uniqueFilteredActions = Array.from(new Set(actionsForUse.map((action) => action.identifier || action.title)))
    .map((unique) => actionsForUse.find((action) => action.identifier === unique || action.title === unique))
    .filter(Boolean) as PromptProps[];

  return (
    <PromptList
      searchMode={true}
      prompts={uniqueFilteredActions}
      clipboardText={clipboardText}
      selectionText={selectionTextForUse}
    />
  );
}
