import { getPreferenceValues, clearSearchBar, showToast, Toast, environment } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, Model, InternalMessage } from "../type";
import { chatTransformer } from "../utils";
import { useAnthropic } from "./useAnthropic";
import { useHistory } from "./useHistory";
import path from "node:path";
import { useMcp } from "./useMcp";
import { MessageParam } from "@anthropic-ai/sdk/resources";

const SYSTEM_MESSAGE = `You have access to a variety of tools that you can use
to help answer questions and complete tasks. However, you are not obligated to
use these tools if you can answer directly. 

The current local time is: ${new Date().toString()}`;

export function useChat<T extends Chat>(props: T[]): ChatHook {
  const [data, setData] = useState<Chat[]>(props);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [useStream] = useState<boolean>(() => {
    return getPreferenceValues<{
      useStream: boolean;
    }>().useStream;
  });
  const [streamData, setStreamData] = useState<Chat | undefined>();

  const history = useHistory();
  const chatAnthropic = useAnthropic();
  const { servers, callTool, isConnecting } = useMcp();

  const isLoadingOrConnecting = isLoading || isConnecting;

  async function ask(question: string, model: Model) {
    clearSearchBar();
    setLoading(true);

    const toast = await showToast({
      title: "Getting your answer...",
      style: Toast.Style.Animated,
    });

    let chat: Chat = {
      id: uuidv4(),
      question,
      messages: [
        {
          type: "user",
          content: question,
          created_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
    };

    setData((prev) => {
      return [...prev, chat];
    });

    if (useStream) {
      const tools = servers.flatMap((server) =>
        server.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        }))
      );

      async function handleStream(messages: MessageParam[]) {
        let currentMessageText = "";
        let currentContentBlock: {
          type: string;
          id?: string;
          text?: string;
          name?: string;
          toolArgs?: any;
        } | null = null;
        let currentToolJsonInput = "";
        let currentAssistantMessage: InternalMessage | null = null;

        const stream = chatAnthropic.messages.stream({
          model: model.model_id,
          temperature: 0.2,
          system: SYSTEM_MESSAGE, // @todo make this configurable
          max_tokens: Number(model.max_tokens) || 8192,
          messages,
          tools,
        });

        try {
          for await (const event of stream) {
            switch (event.type) {
              case "message_start":
                currentMessageText = "";
                currentAssistantMessage = {
                  type: "assistant",
                  content: "",
                  created_at: new Date().toISOString(),
                };
                chat.messages.push(currentAssistantMessage);
                break;
              case "content_block_start":
                currentContentBlock = event.content_block;
                if (event.content_block.type === "tool_use") {
                  currentToolJsonInput = "";
                }
                break;
              case "content_block_delta":
                if (currentContentBlock?.type === "text" && event.delta.type === "text_delta") {
                  const text = event.delta.text;
                  currentMessageText += text;
                  if (currentAssistantMessage) {
                    currentAssistantMessage.content = currentMessageText;
                    chat.answer = currentMessageText; // Keep for backwards compatibility
                    setStreamData({ ...chat });
                  }
                } else if (currentContentBlock?.type === "tool_use" && event.delta.type === "input_json_delta") {
                  currentToolJsonInput += event.delta.partial_json;
                }
                break;
              case "content_block_stop":
                if (currentContentBlock?.type === "tool_use") {
                  const toolName = currentContentBlock.name!;
                  let toolArgs;

                  try {
                    toolArgs = currentToolJsonInput.trim() ? JSON.parse(currentToolJsonInput) : {};
                  } catch (e) {
                    console.error("Error parsing tool arguments. Input was:", currentToolJsonInput);
                    console.error("Parse error:", e);
                    currentContentBlock = null;
                    break;
                  }

                  const server = servers.find((s) => s.tools.some((t) => t.name === toolName));
                  if (!server) {
                    console.error(`Tool ${toolName} not found on any server`);
                    currentContentBlock = null;
                    break;
                  }

                  chat.messages.push({
                    type: "tool_call",
                    content: `${JSON.stringify(currentContentBlock)}`,
                    created_at: new Date().toISOString(),
                  });

                  messages.push({
                    role: "assistant",
                    // @ts-ignore
                    content: [currentContentBlock],
                  });

                  let result: any;
                  try {
                    result = await callTool(server.id, toolName, toolArgs);
                  } catch (e) {
                    console.error("Error calling tool:", e);
                    currentContentBlock = null;
                    break;
                  }

                  chat.messages.push({
                    type: "tool_result",
                    tool_use_id: currentContentBlock?.id,
                    content: result.content ? JSON.stringify(result.content) : JSON.stringify(result),
                    created_at: new Date().toISOString(),
                  });

                  messages.push({
                    role: "user",
                    content: [
                      {
                        type: "tool_result",
                        tool_use_id: currentContentBlock?.id!,
                        content: result.content ? JSON.stringify(result.content) : JSON.stringify(result),
                      },
                    ],
                  });

                  console.log("messages ->", JSON.stringify(messages, null, 2));

                  // Recursively continue the stream with updated messages
                  await handleStream(messages);
                  return;
                }
                currentContentBlock = null;
                break;
              case "message_stop":
                setData((prev) => {
                  return prev.map((a) => {
                    if (a.id === chat.id) {
                      return chat;
                    }
                    return a;
                  });
                });
                break;
            }
          }
        } catch (e) {
          console.error("Stream error:", e);
          throw e;
        }
      }

      try {
        const initialMessages = [...chatTransformer(data), { role: "user" as const, content: question }];
        await handleStream(initialMessages);
        setLoading(false);
        toast.title = "Got your answer!";
        toast.style = Toast.Style.Success;
      } catch (e) {
        toast.title = "Error";
        toast.message = `Couldn't stream message: ${e}`;
        toast.style = Toast.Style.Failure;
        setLoading(false);
      }
    } else {
      await chatAnthropic.messages
        .create({
          model: model.model_id,
          temperature: 0.2,
          system: model.prompt,
          max_tokens: Number(model.max_tokens) || 4096,
          messages: [...chatTransformer(data), { role: "user", content: question }],
        })
        .then(async (res) => {
          if (res.content && res.content[0] && "type" in res.content[0] && res.content[0].type === "text") {
            chat.messages.push({
              type: "assistant",
              content: res.content[0].text,
              created_at: new Date().toISOString(),
            });
            chat.answer = res.content[0].text; // Keep for backwards compatibility
          }
        })
        .catch((err) => {
          toast.title = "Error";
          if (err instanceof Error) {
            toast.message = err?.message;
          }
          toast.style = Toast.Style.Failure;
        });
    }

    setData((prev) => {
      return prev.map((a) => {
        if (a.id === chat.id) {
          return chat;
        }
        return a;
      });
    });

    setLoading(false);

    toast.title = "Got your answer!";
    toast.style = Toast.Style.Success;

    history.add(chat);
  }

  const clear = useCallback(async () => {
    setData([]);
  }, [setData]);

  return useMemo(
    () => ({
      data,
      setData,
      isLoading: isLoadingOrConnecting,
      setLoading,
      selectedChatId,
      setSelectedChatId,
      ask,
      clear,
      streamData,
    }),
    [data, setData, isLoadingOrConnecting, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData]
  );
}
