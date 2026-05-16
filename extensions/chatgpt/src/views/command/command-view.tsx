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
import React, { useCallback, useEffect, useState } from "react";
import { canAccessBrowserExtension } from "../../utils/browser";
import { PrimaryAction } from "../../actions";
import { Command, ChatHook } from "../../type";
import { fetchContent } from "../../utils/cmd-input";
import { getAppIconPath } from "../../utils/icon";
import { getInitialAuthStatus, resolveAuthStatus } from "../../utils/auth";
import { resolveModelOptionForAuth } from "../../utils/model-support";
import Ask from "../../ask";
import { v4 as uuidv4 } from "uuid";
import { mapCommandToModel, useCommand } from "../../hooks/useCommand";
import { AuthRequiredView } from "../auth-required";
import { useModel } from "../../hooks/useModel";

type CommandLaunchContext = { commandId?: string };
export type CommandLaunchProps = LaunchProps<{ launchContext?: CommandLaunchContext }>;

export default function CommandView(props: CommandLaunchProps) {
  const [hasAuth, setHasAuth] = useState<boolean>(() => getInitialAuthStatus().provider !== "none");
  const [isAuthLoading, setAuthLoading] = useState<boolean>(() => getInitialAuthStatus().provider === "none");

  const refreshAuth = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setAuthLoading(true);
    }

    const status = await resolveAuthStatus();
    setHasAuth(status.provider !== "none");
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    refreshAuth(false);
  }, [refreshAuth]);

  if (isAuthLoading) {
    return <Detail markdown="" isLoading={true} />;
  }

  if (!hasAuth) {
    return <AuthRequiredView onAuthChange={() => refreshAuth(true)} />;
  }

  return <AuthenticatedCommandView {...props} />;
}

function AuthenticatedCommandView(props: CommandLaunchProps) {
  const navigation = useNavigation();
  const commands = useCommand();
  const models = useModel();
  const chat = useChat([]);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [userInput, setUserInput] = useState<string | null>(null);
  const [userInputError, setUserInputError] = useState<string | null>(null);
  const [effectiveModel, setEffectiveModel] = useState<string | null>(null);
  const [frontmostApp, setFrontmostApp] = useState<Application | null>(null);

  const requestedCommandId = props.launchContext?.commandId || "";
  const requestedCommand = commands.data[requestedCommandId];

  useEffect(() => {
    getFrontmostApplication().then(setFrontmostApp);
  }, []);

  useEffect(() => {
    (async () => {
      if (!requestedCommand) {
        return;
      }
      const { content, error } = await fetchContent(requestedCommand.contentSource);
      setUserInput(content);
      setUserInputError(error);
    })();
  }, [requestedCommand]);

  useEffect(() => {
    if (!userInput || !requestedCommand || models.isFetching) {
      return;
    }

    (async () => {
      const auth = await resolveAuthStatus();
      const modelOption = resolveModelOptionForAuth(requestedCommand.model, auth.provider, models.option);
      const model = { ...mapCommandToModel(requestedCommand), option: modelOption };

      setAiAnswer(null);
      setEffectiveModel(modelOption);
      chat.ask(userInput, [], model);
    })();
  }, [models.isFetching, models.option, userInput, requestedCommand]);

  useEffect(() => {
    if (!chat.streamData && !chat.isLoading && chat.data.length > 0) {
      const lastChat = chat.data[chat.data.length - 1];
      setAiAnswer(lastChat.answer);
    } else {
      setAiAnswer(chat.streamData?.answer || null);
    }
  }, [chat.streamData, chat.isLoading, chat.data]);

  if (!commands.isLoading && !requestedCommand) {
    return buildCommandNotFoundView(requestedCommandId);
  }
  if (!requestedCommand) {
    return <Detail markdown="" />;
  }
  if (requestedCommand.contentSource === "browserTab" && !canAccessBrowserExtension()) {
    return BROWSER_EXTENSION_NOT_AVAILABLE_VIEW;
  }

  const viewBuilder = new CommandViewBuilder(
    requestedCommand,
    effectiveModel ?? requestedCommand.model,
    chat,
    navigation,
    frontmostApp,
    userInput,
    aiAnswer,
    userInputError || chat.errorMsg,
  );

  return <Detail markdown={viewBuilder.buildContent()} actions={viewBuilder.buildActionPanel()} />;
}

class CommandViewBuilder {
  iconSizePx: number;
  totalViewWidthPx: number;

  command: Command;
  displayModel: string;
  chat: ChatHook;
  navigation: Navigation;
  frontmostApp: Application | null;
  userInput: string | null;
  aiAnswer: string | null;
  error: string | null;

  constructor(
    command: Command,
    displayModel: string,
    chat: ChatHook,
    navigation: Navigation,
    frontmostApp: Application | null,
    userInput: string | null,
    aiAnswer: string | null,
    error: string | null,
  ) {
    this.totalViewWidthPx = 710;
    this.iconSizePx = 17;

    this.command = command;
    this.displayModel = displayModel;
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

    const modelLabel =
      this.displayModel === this.command.model
        ? this.displayModel
        : `${this.displayModel} (switched from ${this.command.model})`;

    return `${this.generateTitleSvg(this.command.name)}

${inputTemplate}

${this.aiAnswer || "..."}

${this.generateStatFooterSvg(modelLabel, footerMessage, chatWidthPx, footerMessageColor)}

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
                model: { ...mapCommandToModel(this.command), option: this.displayModel },
                codexThreadId: this.chat.codexThreadId,
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
