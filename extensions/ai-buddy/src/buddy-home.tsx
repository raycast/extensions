import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  environment,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { getConfig, isInsecureEndpoint, modelFor } from "./llm";
import { LLMView, Mode } from "./llm-view";
import { runDraftReply } from "./launch";
import { clearLookupCache } from "./lookup";
import { clearPronunciationCache } from "./pronounce";
import { PromptForm } from "./prompts-view";
import { PROMPTS, PromptId } from "./prompts";
import { KeyStatusSection, ModelPicker } from "./models-view";
import { AISetup } from "./setup-view";
import { texts } from "./texts";

/** The prompts behind each buddy (Translate also writes the dictionary card and the Vocabulary panel). */
const PROMPTS_OF: Record<Mode, PromptId[]> = {
  translate: ["translate", "lookup", "vocab"],
  reply: ["reply"],
  rewrite: ["rewrite"],
};

const FEATURES: { mode: Mode; title: string; icon: string; hotkey: string }[] = [
  { mode: "translate", title: "Buddy Translate", icon: "buddy-translate.png", hotkey: "⌃⌘T" },
  { mode: "reply", title: "Buddy Draft Reply", icon: "buddy-draft-reply.png", hotkey: "⌃⌘R" },
  { mode: "rewrite", title: "Buddy Polish English", icon: "buddy-polish.png", hotkey: "⌃⌘E" },
];

export function BuddyHome() {
  const { baseUrl, model, provider } = getConfig();
  const t = texts();
  const [text, setText] = useState("");
  // Bumped after a model choice so the Model lines show it on return.
  const [, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);
  const typed = text.trim();
  const host = baseUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  const settingsAction = (
    <Action
      title="Open Settings"
      icon={Icon.Gear}
      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
      onAction={openExtensionPreferences}
    />
  );

  return (
    <List
      isShowingDetail
      filtering={false}
      onSearchTextChange={setText}
      searchBarPlaceholder="Type or paste text, then pick a buddy and press ↵"
    >
      {!typed && <KeyStatusSection onChanged={refresh} />}
      <List.Section
        title={typed ? t.runWith(`${typed.slice(0, 40)}${typed.length > 40 ? "…" : ""}`) : t.featuresSection}
      >
        {FEATURES.map((f) => (
          <List.Item
            key={f.mode}
            title={f.title}
            icon={f.icon}
            detail={
              <List.Item.Detail
                markdown={t.guide[f.mode]}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title={t.hotkeyHint}>
                      <List.Item.Detail.Metadata.TagList.Item text={f.hotkey} color={Color.Blue} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="Input" text={t.inputHint} />
                    <List.Item.Detail.Metadata.Label title="Model" text={modelFor(f.mode)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {typed && f.mode === "reply" ? (
                  // Through its own command, so its Reply Language setting applies.
                  <Action title={`Run ${f.title}`} icon={Icon.Play} onAction={() => runDraftReply(typed)} />
                ) : typed ? (
                  <Action.Push
                    title={`Run ${f.title}`}
                    icon={Icon.Play}
                    target={<LLMView mode={f.mode} text={typed} startedAt={Date.now()} />}
                  />
                ) : null}
                <Action.Push
                  title="Choose Model"
                  icon={Icon.Stars}
                  shortcut={{ modifiers: ["cmd"], key: "m" }}
                  target={<ModelPicker slot={f.mode} title={f.title} onChanged={refresh} />}
                />
                {PROMPTS_OF[f.mode].length === 1 ? (
                  <Action.Push
                    title="Edit Prompt"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={<PromptForm id={PROMPTS_OF[f.mode][0]} />}
                  />
                ) : (
                  <ActionPanel.Submenu title="Edit Prompt" icon={Icon.Pencil} shortcut={Keyboard.Shortcut.Common.Edit}>
                    {PROMPTS_OF[f.mode].map((id) => (
                      <Action.Push key={id} title={PROMPTS[id].title} target={<PromptForm id={id} />} />
                    ))}
                  </ActionPanel.Submenu>
                )}
                {f.mode === "rewrite" && (
                  <Action
                    title="Quick Replace Settings"
                    icon={Icon.Bolt}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                    onAction={openExtensionPreferences}
                  />
                )}
                {settingsAction}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title={t.settingsSection}>
        <List.Item
          title="Settings"
          icon={{ source: Icon.Gear, tintColor: Color.SecondaryText }}
          detail={
            <List.Item.Detail
              markdown={t.settingsGuide}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Provider" text={provider.name} />
                  <List.Item.Detail.Metadata.Label title="Model (All Commands)" text={model} />
                  {provider.id === "custom" && <List.Item.Detail.Metadata.Label title="API Host" text={host} />}
                  {isInsecureEndpoint(baseUrl) && (
                    <List.Item.Detail.Metadata.TagList title="">
                      <List.Item.Detail.Metadata.TagList.Item text={t.insecureShort} color={Color.Red} />
                    </List.Item.Detail.Metadata.TagList>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              {settingsAction}
              <Action.Push title="AI Setup" icon={Icon.Plug} target={<AISetup onSaved={refresh} />} />
              <Action.ShowInFinder title="Show Data Folder" path={environment.supportPath} />
              <Action
                title="Clear Dictionary Cache"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const ok = await confirmAlert({
                    title: "Clear the dictionary cache?",
                    message: "Looked-up words will be fetched again next time.",
                    primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
                  });
                  if (!ok) return;
                  clearPronunciationCache();
                  clearLookupCache();
                  await showToast({ style: Toast.Style.Success, title: "Dictionary cache cleared" });
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
