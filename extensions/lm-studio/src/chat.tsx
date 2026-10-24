import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Form,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  Toast,
  confirmAlert,
  environment,
  openExtensionPreferences,
  showInFinder,
  showToast,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConversationStore,
  appendTurn,
  branchFromTurn,
  deleteTurnFromActiveBranch,
  getActiveBranch,
  getPreviousResponseId,
  renameConversation,
  updateGenerationSettings,
} from "./lib/conversations";
import { friendlyError, getExtensionPreferences } from "./lib/raycast";
import { preferredModel, useDefaultChatModel, useLMStudioModels } from "./lib/use-models";
import {
  ChatEvent,
  ChatInput,
  Conversation,
  ConversationAttachment,
  ConversationSummary,
  ConversationTurn,
  GenerationSettings,
  LMStudioModel,
  ReasoningLevel,
} from "./types";

type LaunchContext = { prefill?: string };

const store = new ConversationStore(environment.supportPath);

function updateTurn(conversation: Conversation, turnId: string, changes: Partial<ConversationTurn>) {
  return {
    ...conversation,
    updatedAt: new Date().toISOString(),
    turns: conversation.turns.map((turn) => (turn.id === turnId ? { ...turn, ...changes } : turn)),
  };
}

function activeModel(models: LMStudioModel[], key: string) {
  return models.find((model) => model.key === key);
}

function extractCodeBlocks(markdown: string) {
  const blocks: Array<{ language: string; code: string }> = [];
  const expression = /```([^\n`]*)\n([\s\S]*?)```/g;
  for (const match of markdown.matchAll(expression)) {
    blocks.push({
      language: match[1].trim() || "Code",
      code: match[2].trimEnd(),
    });
  }
  return blocks;
}

function turnMarkdown(turn: ConversationTurn, showReasoning: boolean) {
  const sections: string[] = [];
  if (turn.attachments?.length) {
    sections.push(
      turn.attachments
        .map((attachment) => {
          const source = `${pathToFileURL(attachment.path).href}?raycast-width=520`;
          return `![${attachment.name}](${source})`;
        })
        .join("\n\n"),
    );
  }
  if (showReasoning && turn.reasoning) {
    sections.push(`<details><summary>Reasoning</summary>\n\n${turn.reasoning}\n\n</details>`);
  }
  if (turn.content) sections.push(turn.content);
  if (turn.toolCalls?.length) {
    sections.push(
      [
        "---",
        "### Tool Calls",
        ...turn.toolCalls.flatMap((call) => [
          `**${call.tool}**`,
          `\`Arguments: ${JSON.stringify(call.arguments)}\``,
          call.output,
        ]),
      ].join("\n\n"),
    );
  }
  if (turn.status === "pending" && !turn.content) sections.push("_Generating…_");
  if (turn.status === "cancelled") sections.push("_Generation stopped._");
  if (turn.error) sections.push(`> **Error:** ${turn.error}`);
  return sections.join("\n\n") || "_Empty message_";
}

function messageDetailsMarkdown(turn: ConversationTurn, fallbackModel: string) {
  const lines = [
    "# Message Details",
    "",
    `- **Role:** ${turn.role === "user" ? "You" : "LM Studio"}`,
    `- **Model:** ${turn.model ?? fallbackModel}`,
    `- **Status:** ${turn.status}`,
  ];
  if (turn.attachments?.length) {
    lines.push(`- **Images:** ${turn.attachments.map((attachment) => attachment.name).join(", ")}`);
  }
  if (turn.stats) {
    lines.push(
      "",
      "## Performance",
      "",
      `- **Input tokens:** ${turn.stats.inputTokens}`,
      `- **Output tokens:** ${turn.stats.totalOutputTokens}`,
      `- **Reasoning tokens:** ${turn.stats.reasoningOutputTokens}`,
      `- **Generation speed:** ${turn.stats.tokensPerSecond.toFixed(1)} tok/s`,
      `- **Time to first token:** ${turn.stats.timeToFirstTokenSeconds.toFixed(2)} s`,
    );
    if (turn.stats.modelLoadTimeSeconds !== undefined) {
      lines.push(`- **Model load time:** ${turn.stats.modelLoadTimeSeconds.toFixed(2)} s`);
    }
  }
  if (turn.responseId) {
    lines.push("", "## Server Chain", "", `\`${turn.responseId}\``);
  }
  return lines.join("\n");
}

function transcriptMarkdown(turns: ConversationTurn[], showReasoning: boolean) {
  if (!turns.length) return "_No messages yet._";
  return turns
    .map((turn) => {
      const speaker = turn.role === "user" ? "You" : "LM Studio";
      return `## ${speaker}\n\n${turnMarkdown(turn, showReasoning)}`;
    })
    .join("\n\n---\n\n");
}

function RenameForm(props: { conversation: Conversation; onRename: (conversation: Conversation) => Promise<void> }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Rename Conversation"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename Conversation"
            icon={Icon.Pencil}
            onSubmit={async (values: { title: string }) => {
              await props.onRename(renameConversation(props.conversation, values.title));
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={props.conversation.title}
        placeholder="Conversation title"
        autoFocus
      />
    </Form>
  );
}

function SettingsForm(props: {
  conversation: Conversation;
  models: LMStudioModel[];
  onSave: (conversation: Conversation) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const currentModel = activeModel(props.models, props.conversation.settings.model);
  const [modelKey, setModelKey] = useState(props.conversation.settings.model);
  const model = activeModel(props.models, modelKey) ?? currentModel;
  const reasoningOptions = model?.capabilities?.reasoning?.allowedOptions ?? [];

  return (
    <Form
      navigationTitle="Conversation Settings"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Settings"
            icon={Icon.Checkmark}
            onSubmit={async (values: {
              model: string;
              systemPrompt: string;
              temperature: string;
              maxOutputTokens: string;
              reasoning: string;
              showReasoning: boolean;
              pluginId: string;
              allowedTools: string;
            }) => {
              const temperature = Number(values.temperature);
              const maxOutputTokens = Number(values.maxOutputTokens);
              if (!Number.isFinite(temperature) || temperature < 0 || temperature > 1) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Temperature Must Be Between 0 and 1",
                });
                return;
              }
              if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 1) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Maximum Tokens Must Be a Positive Integer",
                });
                return;
              }
              const allowedTools = values.allowedTools
                .split(",")
                .map((tool) => tool.trim())
                .filter(Boolean);
              if (values.pluginId.trim() && allowedTools.length === 0) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Add at Least One Allowed Tool",
                  message: "LM Studio tools execute server-side, so an explicit allowlist is required.",
                });
                return;
              }
              const changes: Partial<GenerationSettings> = {
                model: values.model,
                systemPrompt: values.systemPrompt.trim(),
                temperature,
                maxOutputTokens,
                showReasoning: values.showReasoning,
                reasoning: values.reasoning === "default" ? undefined : (values.reasoning as ReasoningLevel),
                plugin: values.pluginId.trim()
                  ? {
                      type: "plugin",
                      id: values.pluginId.trim(),
                      allowedTools,
                    }
                  : undefined,
              };
              await props.onSave(updateGenerationSettings(props.conversation, changes));
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="model" title="Model" value={modelKey} onChange={setModelKey}>
        {props.models.map((item) => (
          <Form.Dropdown.Item
            key={item.key}
            value={item.key}
            title={`${item.displayName}${item.loadedInstances.length ? " (Loaded)" : ""}`}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="systemPrompt"
        title="System Prompt"
        defaultValue={props.conversation.settings.systemPrompt}
        placeholder="Instructions for this conversation"
      />
      <Form.TextField
        id="temperature"
        title="Temperature"
        defaultValue={String(props.conversation.settings.temperature)}
        placeholder="0.7"
      />
      <Form.TextField
        id="maxOutputTokens"
        title="Maximum Tokens"
        defaultValue={String(props.conversation.settings.maxOutputTokens)}
        placeholder="2048"
      />
      <Form.Dropdown id="reasoning" title="Reasoning" defaultValue={props.conversation.settings.reasoning ?? "default"}>
        <Form.Dropdown.Item value="default" title="Model Default" />
        {reasoningOptions.map((option) => (
          <Form.Dropdown.Item key={option} value={option} title={option} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="showReasoning"
        title="Reasoning Display"
        label="Show reasoning above answers"
        defaultValue={props.conversation.settings.showReasoning}
      />
      <Form.Separator />
      <Form.Description
        title="LM Studio MCP"
        text="Optional and disabled by default. LM Studio executes allowed tools on its server before Raycast receives the result."
      />
      <Form.TextField
        id="pluginId"
        title="Plugin ID"
        defaultValue={props.conversation.settings.plugin?.id ?? ""}
        placeholder="mcp/playwright"
      />
      <Form.TextField
        id="allowedTools"
        title="Allowed Tools"
        defaultValue={props.conversation.settings.plugin?.allowedTools.join(", ") ?? ""}
        placeholder="tool_one, tool_two"
        info="Comma-separated tool names. An explicit allowlist is required."
      />
    </Form>
  );
}

function MessageForm(props: {
  canAttachImages: boolean;
  initialPrompt?: string;
  onSubmit: (prompt: string, imagePaths: string[]) => Promise<void>;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Compose Message"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Message"
            icon={Icon.ArrowRight}
            onSubmit={async (values: { prompt: string; images: string[] }) => {
              if (!values.prompt.trim()) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Enter a Message",
                });
                return;
              }
              await props.onSubmit(values.prompt, values.images);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Message"
        defaultValue={props.initialPrompt}
        placeholder="Ask anything…"
        autoFocus
      />
      {props.canAttachImages ? (
        <Form.FilePicker
          id="images"
          title="Screenshots or Images"
          allowMultipleSelection
          canChooseDirectories={false}
          info="Up to four JPEG, PNG, or WebP files, 10 MB each. Save a macOS screenshot, then select it here."
        />
      ) : (
        <Form.Description title="Images" text="The selected model does not advertise vision support." />
      )}
    </Form>
  );
}

function EditMessageForm(props: { turn: ConversationTurn; onSubmit: (content: string) => Promise<void> }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Edit and Resend"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Edited Message"
            icon={Icon.ArrowRight}
            onSubmit={async (values: { content: string }) => {
              if (!values.content.trim()) return;
              await props.onSubmit(values.content);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Message" defaultValue={props.turn.content} autoFocus />
    </Form>
  );
}

function BranchesView(props: { conversation: Conversation; onSelect: (turnId: string | null) => Promise<void> }) {
  const activeIds = new Set(getActiveBranch(props.conversation).map((turn) => turn.id));
  return (
    <List navigationTitle="Conversation Branches">
      <List.Item
        title="Conversation Start"
        icon={props.conversation.activeLeafId ? Icon.Circle : Icon.Checkmark}
        actions={
          <ActionPanel>
            <Action title="Branch from Conversation Start" icon={Icon.Shuffle} onAction={() => props.onSelect(null)} />
          </ActionPanel>
        }
      />
      {props.conversation.turns.map((turn) => (
        <List.Item
          key={turn.id}
          title={turn.role === "user" ? "You" : "Assistant"}
          subtitle={turn.content.replace(/\s+/g, " ").slice(0, 100)}
          icon={activeIds.has(turn.id) ? Icon.Checkmark : Icon.Shuffle}
          accessories={[{ date: new Date(turn.createdAt) }]}
          actions={
            <ActionPanel>
              <Action title="Select Branch Here" icon={Icon.Shuffle} onAction={() => props.onSelect(turn.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ChatView(props: {
  conversationId: string;
  models: LMStudioModel[];
  initialPrompt?: string;
  onLibraryChange: () => void;
}) {
  const { pop } = useNavigation();
  const { client } = useLMStudioModels("llm");
  const [conversation, setConversation] = useState<Conversation>();
  const conversationRef = useRef<Conversation | undefined>(undefined);
  const [prompt, setPrompt] = useState(props.initialPrompt ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<string>();
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const abortController = useRef<AbortController | undefined>(undefined);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const commitConversation = useCallback(
    async (next: Conversation) => {
      const saved = await store.save(next);
      conversationRef.current = saved;
      setConversation(saved);
      props.onLibraryChange();
      return saved;
    },
    [props.onLibraryChange],
  );

  useEffect(() => {
    let active = true;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    void store.get(props.conversationId).then((value) => {
      if (!active) return;
      conversationRef.current = value;
      setSelectedTurnId(value ? (getActiveBranch(value).at(-1)?.id ?? null) : null);
      revealTimer = setTimeout(() => {
        if (!active) return;
        setConversation(value);
        setIsLoading(false);
      }, 0);
    });
    return () => {
      active = false;
      if (revealTimer) clearTimeout(revealTimer);
      abortController.current?.abort();
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, [props.conversationId]);

  async function generate(source: Conversation, content: string, imagePaths: string[] = []) {
    if (isGenerating || !content.trim()) return;
    const model = activeModel(props.models, source.settings.model);
    if (!model) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Model Is No Longer Available",
      });
      return;
    }
    if (imagePaths.length && !model.capabilities?.vision) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Model Does Not Support Images",
      });
      return;
    }

    let attachments: ConversationAttachment[] = [];
    try {
      attachments = await store.copyAttachments(source.id, imagePaths);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Attach Images",
        message: friendlyError(error),
      });
      return;
    }

    const previousResponseId = getPreviousResponseId(source);
    const userId = randomUUID();
    const assistantId = randomUUID();
    let working = appendTurn(source, {
      id: userId,
      role: "user",
      content: content.trim(),
      attachments,
      model: source.settings.model,
      status: "completed",
    });
    working = appendTurn(working, {
      id: assistantId,
      parentId: userId,
      role: "assistant",
      content: "",
      reasoning: "",
      model: source.settings.model,
      status: "pending",
    });
    if (source.title === "New Conversation") {
      working = renameConversation(working, content.trim().slice(0, 60));
    }
    conversationRef.current = working;
    setConversation(working);
    setSelectedTurnId(assistantId);
    setPrompt("");
    setIsGenerating(true);
    setProgress("Starting…");

    const controller = new AbortController();
    abortController.current = controller;
    let streamedText = "";
    let streamedReasoning = "";

    const flush = () => {
      const current = conversationRef.current;
      if (!current) return;
      const next = updateTurn(current, assistantId, {
        content: streamedText,
        reasoning: streamedReasoning,
      });
      conversationRef.current = next;
      setConversation(next);
      flushTimer.current = undefined;
    };
    const scheduleFlush = () => {
      if (!flushTimer.current) flushTimer.current = setTimeout(flush, 50);
    };

    try {
      const imageInputs = await Promise.all(
        attachments.map(async (attachment) => ({
          type: "image" as const,
          dataUrl: await store.attachmentDataUrl(attachment),
        })),
      );
      const input: ChatInput = imageInputs.length
        ? [{ type: "message", content: content.trim() }, ...imageInputs]
        : content.trim();

      const result = await client.chat({
        model: source.settings.model,
        input,
        systemPrompt: source.settings.systemPrompt || undefined,
        temperature: source.settings.temperature,
        maxOutputTokens: source.settings.maxOutputTokens,
        reasoning: source.settings.reasoning,
        integrations: source.settings.plugin ? [source.settings.plugin] : undefined,
        previousResponseId,
        store: true,
        signal: controller.signal,
        onEvent(event: ChatEvent) {
          if (event.type === "message.delta") {
            streamedText += event.content;
            scheduleFlush();
          } else if (event.type === "reasoning.delta") {
            streamedReasoning += event.content;
            if (source.settings.showReasoning) scheduleFlush();
          } else if (event.type === "model_load.progress") {
            setProgress(`Loading model… ${Math.round(event.progress * 100)}%`);
          } else if (event.type === "prompt_processing.progress") {
            setProgress(`Processing prompt… ${Math.round(event.progress * 100)}%`);
          } else if (event.type === "message.start") {
            setProgress("Generating…");
          } else if (event.type === "tool_call.start") {
            setProgress(`Running ${event.tool}…`);
          }
        },
      });
      if (flushTimer.current) clearTimeout(flushTimer.current);
      const current = conversationRef.current ?? working;
      const completed = updateTurn(current, assistantId, {
        content: result.text,
        reasoning: result.reasoning,
        toolCalls: result.toolCalls,
        stats: result.stats,
        responseId: result.responseId,
        status: "completed",
        error: result.errors.length ? result.errors.map((error) => error.message).join("\n") : undefined,
      });
      await commitConversation(completed);
    } catch (error) {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flush();
      const current = conversationRef.current ?? working;
      const stopped = controller.signal.aborted;
      const failed = updateTurn(current, assistantId, {
        content: streamedText,
        reasoning: streamedReasoning,
        status: stopped ? "cancelled" : "error",
        error: stopped ? undefined : friendlyError(error),
      });
      await commitConversation(failed);
      if (!stopped) {
        await showToast({
          style: Toast.Style.Failure,
          title: "LM Studio Request Failed",
          message: friendlyError(error),
        });
      }
    } finally {
      setIsGenerating(false);
      setProgress(undefined);
      abortController.current = undefined;
    }
  }

  async function branchAndGenerate(parentId: string | null, content: string, imagePaths: string[] = []) {
    if (!conversationRef.current) return;
    const branched = branchFromTurn(conversationRef.current, parentId);
    conversationRef.current = branched;
    setConversation(branched);
    await generate(branched, content, imagePaths);
  }

  if (!conversation) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={isLoading ? "Loading conversation…" : "# Conversation Not Found\n\nIt may have been deleted."}
      />
    );
  }

  const branch = getActiveBranch(conversation);
  const selectedTurn = branch.find((turn) => turn.id === selectedTurnId) ?? branch.at(-1);
  const selectedModel = activeModel(props.models, conversation.settings.model);
  const canAttachImages = selectedModel?.capabilities?.vision === true;

  const actionsForTurn = (turn?: ConversationTurn) => {
    const codeBlocks = turn ? extractCodeBlocks(turn.content) : [];
    return (
      <ActionPanel>
        {prompt.trim() && !isGenerating ? (
          <Action title="Send Message" icon={Icon.ArrowRight} onAction={() => generate(conversation, prompt)} />
        ) : null}
        {isGenerating ? (
          <Action title="Stop Generating" icon={Icon.Stop} onAction={() => abortController.current?.abort()} />
        ) : null}
        {turn?.content ? <Action.CopyToClipboard title="Copy Message" content={turn.content} /> : null}
        {turn?.content ? <Action.Paste title="Paste Message" content={turn.content} /> : null}
        {turn?.role === "assistant" && turn.parentId && !isGenerating ? (
          <Action
            title="Regenerate Answer"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => {
              const userTurn = conversation.turns.find((candidate) => candidate.id === turn.parentId);
              if (userTurn) {
                void branchAndGenerate(
                  userTurn.parentId,
                  userTurn.content,
                  userTurn.attachments?.map((attachment) => attachment.path),
                );
              }
            }}
          />
        ) : null}
        {turn?.role === "user" && !isGenerating ? (
          <Action.Push
            title="Edit and Resend"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={
              <EditMessageForm
                turn={turn}
                onSubmit={(content) =>
                  branchAndGenerate(
                    turn.parentId,
                    content,
                    turn.attachments?.map((attachment) => attachment.path),
                  )
                }
              />
            }
          />
        ) : null}
        {turn?.reasoning ? (
          <Action.Push
            title="View Reasoning"
            icon={Icon.LightBulb}
            target={
              <Detail
                navigationTitle="Reasoning"
                markdown={turn.reasoning}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Reasoning" content={turn.reasoning} />
                  </ActionPanel>
                }
              />
            }
          />
        ) : null}
        {turn ? (
          <Action.Push
            title="Message Details"
            icon={Icon.Info}
            target={
              <Detail
                navigationTitle="Message Details"
                markdown={messageDetailsMarkdown(turn, conversation.settings.model)}
              />
            }
          />
        ) : null}
        {codeBlocks.length ? (
          <ActionPanel.Submenu title="Copy Code Block…" icon={Icon.CodeBlock}>
            {codeBlocks.map((block, index) => (
              <Action.CopyToClipboard
                key={`${block.language}-${index}`}
                title={`${block.language} ${index + 1}`}
                content={block.code}
              />
            ))}
          </ActionPanel.Submenu>
        ) : null}
        <ActionPanel.Section title="Conversation">
          <Action.Push
            title="Send Screenshot or Image…"
            icon={Icon.Image}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            target={
              <MessageForm
                canAttachImages={canAttachImages}
                onSubmit={(content, images) => generate(conversation, content, images)}
              />
            }
          />
          <Action.Push
            title="View Full Transcript"
            icon={Icon.TextDocument}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            target={
              <Detail
                navigationTitle={conversation.title}
                markdown={transcriptMarkdown(branch, conversation.settings.showReasoning)}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Transcript"
                      content={transcriptMarkdown(branch, conversation.settings.showReasoning)}
                    />
                    <Action.Push
                      title="Send Screenshot or Image…"
                      icon={Icon.Image}
                      target={
                        <MessageForm
                          canAttachImages={canAttachImages}
                          onSubmit={(content, images) => generate(conversation, content, images)}
                        />
                      }
                    />
                  </ActionPanel>
                }
              />
            }
          />
          {turn ? (
            <Action
              title="Branch from Here"
              icon={Icon.Shuffle}
              onAction={() => commitConversation(branchFromTurn(conversation, turn.id))}
            />
          ) : null}
          <Action.Push
            title="View Branches"
            icon={Icon.Shuffle}
            target={
              <BranchesView
                conversation={conversation}
                onSelect={async (turnId) => {
                  await commitConversation(branchFromTurn(conversation, turnId));
                  pop();
                }}
              />
            }
          />
          {turn && !isGenerating ? (
            <Action
              title="Delete from Here"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Delete This Turn and Its Descendants?",
                  message: "The previous branch remains stored, but it will no longer be the active conversation path.",
                  primaryAction: {
                    title: "Delete from Here",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (confirmed) {
                  await commitConversation(deleteTurnFromActiveBranch(conversation, turn.id));
                }
              }}
            />
          ) : null}
          <Action.Push
            title="Conversation Settings…"
            icon={Icon.Gear}
            target={
              <SettingsForm
                conversation={conversation}
                models={props.models}
                onSave={async (next) => {
                  await commitConversation(next);
                }}
              />
            }
          />
          <Action.Push
            title="Rename Conversation…"
            icon={Icon.Pencil}
            target={
              <RenameForm
                conversation={conversation}
                onRename={async (next) => {
                  await commitConversation(next);
                }}
              />
            }
          />
          <Action
            title="Export as Markdown"
            icon={Icon.Download}
            onAction={async () =>
              showInFinder(
                await store.exportConversation(conversation.id, "markdown", {
                  includeReasoning: conversation.settings.showReasoning,
                }),
              )
            }
          />
          <Action
            title="Export as JSON"
            icon={Icon.Download}
            onAction={async () => showInFinder(await store.exportConversation(conversation.id, "json"))}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  };

  return (
    <List
      navigationTitle={conversation.title}
      isLoading={isLoading || isGenerating}
      isShowingDetail={branch.length > 0}
      filtering={false}
      searchText={prompt}
      onSearchTextChange={setPrompt}
      selectedItemId={selectedTurnId ?? undefined}
      onSelectionChange={setSelectedTurnId}
      searchBarPlaceholder={progress ?? `Message ${selectedModel?.displayName ?? conversation.settings.model}…`}
    >
      {branch.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.Message, tintColor: Color.Purple }}
          title="Start a Local Conversation"
          description="Type a message above and press ↵, or attach images from the Action Panel."
          actions={actionsForTurn()}
        />
      ) : (
        branch.map((turn) => (
          <List.Item
            key={turn.id}
            id={turn.id}
            title={turn.role === "user" ? "You" : "Assistant"}
            subtitle={turn.content.replace(/\s+/g, " ").slice(0, 100) || "Generating…"}
            icon={turn.role === "user" ? Icon.Person : Icon.Stars}
            accessories={[
              ...(turn.attachments?.length
                ? [
                    {
                      icon: Icon.Image,
                      tooltip: `${turn.attachments.length} image(s)`,
                    },
                  ]
                : []),
              ...(turn.toolCalls?.length
                ? [
                    {
                      icon: Icon.Hammer,
                      tooltip: `${turn.toolCalls.length} tool call(s)`,
                    },
                  ]
                : []),
            ]}
            detail={
              <List.Item.Detail markdown={turnMarkdown(selectedTurn ?? turn, conversation.settings.showReasoning)} />
            }
            actions={actionsForTurn(turn)}
          />
        ))
      )}
    </List>
  );
}

export default function ChatCommand(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const { push } = useNavigation();
  const { models, isLoading: isLoadingModels, error, refresh } = useLMStudioModels("llm");
  const { defaultModelKey, isLoadingDefaultModel } = useDefaultChatModel();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const launchedContext = useRef(false);

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    setConversations(await store.list());
    setIsLoadingConversations(false);
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const openConversation = useCallback(
    (id: string, initialPrompt?: string) => {
      push(
        <ChatView
          conversationId={id}
          models={models}
          initialPrompt={initialPrompt}
          onLibraryChange={() => void loadConversations()}
        />,
      );
    },
    [loadConversations, models, push],
  );

  const createConversation = useCallback(
    async (initialPrompt?: string) => {
      const model = preferredModel(models, defaultModelKey);
      if (!model) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Language Model Available",
          message: "Download a model in LM Studio, then refresh models.",
        });
        return;
      }
      const preferences = getExtensionPreferences();
      const conversation = await store.create({
        settings: {
          model: model.key,
          systemPrompt: preferences.systemPrompt?.trim() || "You are a helpful assistant.",
          temperature: 0.7,
          maxOutputTokens: 2048,
          reasoning: model.capabilities?.reasoning?.default,
          showReasoning: false,
        },
      });
      await loadConversations();
      openConversation(conversation.id, initialPrompt);
    },
    [defaultModelKey, loadConversations, models, openConversation],
  );

  useEffect(() => {
    const prefill = props.launchContext?.prefill?.trim();
    if (prefill && models.length > 0 && !isLoadingModels && !isLoadingDefaultModel && !launchedContext.current) {
      launchedContext.current = true;
      void createConversation(prefill);
    }
  }, [createConversation, isLoadingDefaultModel, isLoadingModels, models.length, props.launchContext]);

  const hasModels = models.length > 0;
  const isLoading = isLoadingModels || isLoadingConversations || isLoadingDefaultModel;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search conversations…">
      {!isLoading && conversations.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.Message, tintColor: Color.Purple }}
          title={error ?? (hasModels ? "No Conversations Yet" : "No Language Models")}
          description={
            error
              ? "Start LM Studio's local server and refresh."
              : hasModels
                ? "Create a conversation to start chatting locally."
                : "Download a language model in LM Studio, then refresh."
          }
          actions={
            <ActionPanel>
              {hasModels ? (
                <Action
                  title="New Conversation"
                  icon={Icon.Plus}
                  onAction={() => createConversation()}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
              ) : null}
              <Action
                title="Refresh Models"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Conversations" subtitle={`${conversations.length}`}>
          {conversations.map((conversation) => (
            <List.Item
              key={conversation.id}
              title={conversation.title}
              subtitle={conversation.preview}
              icon={Icon.Message}
              accessories={[{ text: conversation.model }, { date: new Date(conversation.updatedAt) }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Conversation"
                    icon={Icon.Message}
                    onAction={() => openConversation(conversation.id)}
                  />
                  <Action
                    title="New Conversation"
                    icon={Icon.Plus}
                    onAction={() => createConversation()}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                  <Action
                    title="Export as Markdown"
                    icon={Icon.Download}
                    onAction={async () => showInFinder(await store.exportConversation(conversation.id, "markdown"))}
                  />
                  <Action
                    title="Delete Conversation"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: `Delete “${conversation.title}”?`,
                        message: "This removes its transcript and copied attachments from Raycast's extension storage.",
                        primaryAction: {
                          title: "Delete Conversation",
                          style: Alert.ActionStyle.Destructive,
                        },
                      });
                      if (confirmed) {
                        await store.delete(conversation.id);
                        await loadConversations();
                      }
                    }}
                  />
                  <Action
                    title="Delete All Conversations"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: "Delete All Conversations?",
                        message: "This permanently removes every saved transcript, copied attachment, and export.",
                        primaryAction: {
                          title: "Delete All",
                          style: Alert.ActionStyle.Destructive,
                        },
                      });
                      if (confirmed) {
                        await store.clear();
                        await loadConversations();
                      }
                    }}
                  />
                  <Action
                    title="Refresh Models"
                    icon={Icon.ArrowClockwise}
                    onAction={refresh}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
