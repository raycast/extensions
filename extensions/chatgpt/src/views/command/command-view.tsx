import {
  Action,
  ActionPanel,
  Application,
  Detail,
  getFrontmostApplication,
  Icon,
  LaunchProps,
  List,
  Navigation,
  open,
  useNavigation,
} from "@raycast/api";
import { useChat } from "../../hooks/useChat";
import React, { useEffect, useRef, useState } from "react";
import { canAccessBrowserExtension } from "../../utils/browser";
import { PrimaryAction } from "../../actions";
import { Command, ChatHook, Model } from "../../type";
import { fetchContent } from "../../utils/cmd-input";
import { getAppIconPath } from "../../utils/icon";
import Ask from "../../ask";
import { v4 as uuidv4 } from "uuid";
import { useCommand } from "../../hooks/useCommand";

type CommandLaunchContext = { commandId?: string };
export type CommandLaunchProps = LaunchProps<{ launchContext?: CommandLaunchContext }>;

export default function CommandView(props: CommandLaunchProps) {
  const commands = useCommand();
  const requestedCommandId = props.launchContext?.commandId || "";
  if (commands.isLoading) return <Detail isLoading markdown="" />;
  const command = commands.data[requestedCommandId];
  if (!command) return buildCommandNotFoundView(requestedCommandId);
  if (command.contentSource === "browserTab" && !canAccessBrowserExtension()) {
    return BROWSER_EXTENSION_NOT_AVAILABLE_VIEW;
  }
  return <CommandInput key={command.id} command={command} model={commands.resolveModel(command)} />;
}

function CommandInput({ command, model }: { command: Command; model: Model }) {
  const [input, setInput] = useState<Awaited<ReturnType<typeof fetchContent>>>();

  useEffect(() => {
    let active = true;
    void fetchContent(command.contentSource).then((result) => {
      if (active) setInput(result);
    });
    return () => {
      active = false;
    };
  }, [command.contentSource]);

  if (!input) return <Detail isLoading markdown="" />;
  if (input.error || !input.content) return <Detail markdown={input.error ?? "There is no text to process."} />;
  return <CommandAnswer command={command} model={model} userInput={input.content} />;
}

function CommandAnswer({ command, model, userInput }: { command: Command; model: Model; userInput: string }) {
  const navigation = useNavigation();
  const chat = useChat([]);
  const [frontmostApp, setFrontmostApp] = useState<Application | null>(null);
  const [initialRequest] = useState(() => ({ ask: chat.ask, userInput, model }));
  const requestStarted = useRef(false);
  const aiAnswer = chat.streamData?.answer ?? (!chat.isLoading ? chat.data.at(-1)?.answer : undefined) ?? null;

  useEffect(() => {
    if (command.contentSource !== "clipboard")
      void getFrontmostApplication()
        .then(setFrontmostApp)
        .catch(() => {});
  }, [command.contentSource]);

  useEffect(() => {
    if (requestStarted.current) return;
    requestStarted.current = true;
    void initialRequest.ask(initialRequest.userInput, [], initialRequest.model);
  }, [initialRequest]);

  const viewBuilder = new CommandViewBuilder(
    { ...command, model: model.option },
    chat,
    navigation,
    frontmostApp,
    userInput,
    aiAnswer,
    chat.errorMsg,
    model,
  );

  return <Detail markdown={viewBuilder.buildContent()} actions={viewBuilder.buildActionPanel()} />;
}

class CommandViewBuilder {
  iconSizePx: number;
  totalViewWidthPx: number;

  command: Command;
  model: Model;
  chat: ChatHook;
  navigation: Navigation;
  frontmostApp: Application | null;
  userInput: string | null;
  aiAnswer: string | null;
  error: string | null;

  constructor(
    command: Command,
    chat: ChatHook,
    navigation: Navigation,
    frontmostApp: Application | null,
    userInput: string | null,
    aiAnswer: string | null,
    error: string | null,
    model: Model,
  ) {
    this.totalViewWidthPx = 710;
    this.iconSizePx = 17;

    this.command = command;
    this.model = model;
    this.chat = chat;
    this.navigation = navigation;
    this.frontmostApp = frontmostApp;
    this.userInput = userInput;
    this.aiAnswer = aiAnswer;
    this.error = error;
  }

  buildContent(): string {
    let inputTemplate = "";
    if (this.command.isDisplayInput) {
      // Show user input as preformatted text because it allows the text to be displayed
      // exactly as it is. If we don't wrap it or format it as a quote, some symbols may be
      // rendered as Markdown markup.
      inputTemplate = `\`\`\`\n${(this.userInput || "...").trim()}\n\`\`\``;
    }

    let footerMessage = "";
    let chatWidthPx = 7;
    let footerMessageColor: "gray" | "yellow" | "red" = "gray";
    if (this.chat.isAborted) {
      footerMessage = "Canceled";
      footerMessageColor = "yellow";
    } else if (this.error) {
      chatWidthPx = 6;
      footerMessage = "An unexpected error occurred; the command execution failed.";
      footerMessageColor = "red";
    } else if (this.aiAnswer !== null && !this.chat.isLoading) {
      chatWidthPx = 6.1;
      footerMessage = "Continue in Chat ⌘ + 🅹";
    }

    return `${this.generateTitleSvg(this.command.name)}

${inputTemplate}

${this.aiAnswer || "..."}

${this.generateStatFooterSvg(this.command.model, footerMessage, chatWidthPx, footerMessageColor)}

${this.error ? "---" : ""}
${this.error || ""}`;
  }

  generateTitleSvg(title: string): string {
    const width = this.totalViewWidthPx - this.iconSizePx;
    const titleImage = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${this.iconSizePx}" style="background: transparent;">
  <style>
    .text { 
      font-size: 14px; 
      fill: grey; 
      font-family: Arial, sans-serif;
      font-weight: bold;
    }
  </style>
  <text x="0" y="16" class="text">${title}</text>
</svg>`;

    return `${this.getFrontmostAppIcon()}![CommandName](data:image/svg+xml;base64,${Buffer.from(
      titleImage,
      "utf-8",
    ).toString("base64")})`;
  }

  generateStatFooterSvg(
    model: string,
    message: string,
    charWidthPx: number = 7,
    color: "gray" | "yellow" | "red" = "gray",
  ) {
    // charWidthPx is a workaround to align the message to the right edge.
    // I couldn't find a better solution, so for each value that will be sent
    // to the message, you need to calculate charWidthPx manually.
    const width = this.totalViewWidthPx - this.iconSizePx;
    const messageWidth = message.length * charWidthPx;

    const statImage = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${this.iconSizePx}" style="background: transparent;">
  <style>
    .text { 
      font-size: 13px; 
      fill: grey; 
      font-family: Arial, sans-serif; 
    }
  </style>
  
  <text x="5" y="14.5" class="text">${model}</text>
  <text x="${width - messageWidth}" y="14.5" class="text" style="fill: ${color};">${message}</text>
</svg>`;

    const modelIcon = `&#x200b;![ModelIcon](icon.png?raycast-width=${this.iconSizePx}&raycast-height=${this.iconSizePx})`;
    return `${modelIcon}![CommandFooter](data:image/svg+xml;base64,${Buffer.from(statImage, "utf-8").toString(
      "base64",
    )})`;
  }

  getFrontmostAppIcon(): string {
    let appIconPath = "";
    if (this.command.contentSource === "clipboard") {
      appIconPath = "clipboard.svg";
    } else if (this.frontmostApp?.path) {
      try {
        appIconPath = getAppIconPath(this.frontmostApp.path).replace(/ /g, "%20");
      } catch (e) {
        console.error(e);
      }
    }
    const markdownIcon = `&#x200b;![AppIcon](${appIconPath}?raycast-width=${this.iconSizePx}&raycast-height=${this.iconSizePx}) `;
    return appIconPath ? markdownIcon : "";
  }

  buildActionPanel(): React.JSX.Element {
    const cancel = <Action key="cancel" title="Cancel" icon={Icon.Stop} onAction={this.chat.abort} />;
    const pasteToActiveApp = (
      <Action.Paste
        key="pasteToActiveApp"
        title={`Paste Response to ${this.frontmostApp ? this.frontmostApp.name : "Active App"}`}
        content={this.aiAnswer || ""}
        icon={this.frontmostApp ? { fileIcon: this.frontmostApp.path } : Icon.AppWindow}
      />
    );
    const copyToClipboard = (
      <Action.CopyToClipboard key="copyToClipboard" title={`Copy Response`} content={this.aiAnswer || ""} />
    );
    const continueInChat = (
      <Action
        key="continueInChat"
        title="Continue in Chat"
        icon={Icon.Message}
        onAction={() => {
          this.navigation.push(
            <Ask
              conversation={{
                id: uuidv4(),
                chats: this.chat.data,
                model: this.model,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                pinned: false,
              }}
            />,
          );
        }}
        shortcut={{ modifiers: ["cmd"], key: "j" }}
      />
    );

    const mainActions: React.JSX.Element[] = [];
    const extraActions: React.JSX.Element[] = [];
    if (this.chat.isLoading) {
      mainActions.push(cancel);
    } else {
      if (this.command.contentSource === "selectedText") {
        mainActions.push(pasteToActiveApp);
        mainActions.push(copyToClipboard);
      } else {
        mainActions.push(copyToClipboard);
      }
      extraActions.push(continueInChat);
    }

    return (
      <ActionPanel>
        <ActionPanel.Section>{mainActions}</ActionPanel.Section>
        {extraActions ? <ActionPanel.Section>{extraActions}</ActionPanel.Section> : null}
      </ActionPanel>
    );
  }
}

function buildCommandNotFoundView(commandId: string) {
  return (
    <Detail
      markdown={
        `AI command with id=${commandId} not found. This AI command may have been deleted.` +
        `You need to remove this quicklink, create the AI command again, and then create the quicklink once more.`
      }
    />
  );
}

const BROWSER_EXTENSION_NOT_AVAILABLE_VIEW = (
  <List
    actions={
      <ActionPanel>
        <PrimaryAction title="Install" onAction={() => open("https://www.raycast.com/browser-extension")} />
      </ActionPanel>
    }
  >
    <List.EmptyView
      icon={Icon.BoltDisabled}
      title={"Browser Extension Required"}
      description={"This command need install Raycast browser extension to work. Please install it first"}
    />
  </List>
);
