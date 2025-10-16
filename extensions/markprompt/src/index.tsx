import crypto from "node:crypto";

import {
  Action,
  ActionPanel,
  Cache,
  Icon,
  Image,
  List,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { createParser } from "eventsource-parser";
import { useCallback, useEffect, useState, useTransition } from "react";

type Prompt = {
  id: string;
  prompt: string;
  answer: string;
};

const cache = new Cache({});

export default function Ask() {
  const [selectedPromptId, setSelectedPromptId] = useState<
    string | undefined
  >();
  const [prompt, setPrompt] = useState<string>("");
  const [, startTransition] = useTransition();

  const [prompts, setPrompts] = useState<Prompt[]>(() =>
    JSON.parse(cache.get("prompts") ?? "[]"),
  );

  useEffect(() => {
    if (JSON.stringify(prompts) === cache.get("prompts")) return;
    cache.set("prompts", JSON.stringify(prompts));
  }, [prompts]);

  const token = getPreferenceValues()?.token;

  const body = new TextEncoder().encode(
    JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4-1106-preview",
    }),
  );

  const updatePrompts = useCallback((id: string, next: Partial<Prompt>) => {
    setPrompts((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...next } : x)),
    );
  }, []);

  const { isLoading, mutate } = useFetch("https://api.markprompt.com/chat", {
    parseResponse: async (response) => {
      if (!response.body) return;

      const contentType = response.headers.get("content-type");

      if (contentType?.startsWith("application/json")) {
        const json = await response.json();

        if ("success" in json && !json.success) {
          return showToast({
            title: "Ask Markprompt failed",
            message: json.message,
            style: Toast.Style.Failure,
          });
        }

        return showToast({
          title: "Ask Markprompt failed",
          message: `An unknown error occurred, ${JSON.stringify(json)}`,
        });
      }

      if (contentType?.startsWith("text/plain")) {
        const message = await response.text();
        return showToast({
          title: "Ask Markprompt failed",
          message: message,
          style: Toast.Style.Failure,
        });
      }

      const raw = response.headers.get("x-markprompt-data");
      let data = {} as { conversationId: string; promptId: string };
      if (raw) {
        const str = new TextDecoder().decode(
          new Uint8Array(raw.split(",").map(Number)),
        );
        data = JSON.parse(str);
      }

      startTransition(() => {
        updatePrompts(selectedPromptId!, { id: data.conversationId });
        setSelectedPromptId(data.conversationId);
      });

      let answer = "";

      const parser = createParser((event) => {
        if (!("data" in event)) return;
        if (event.data === "[DONE]") return;
        const data = JSON.parse(event.data);
        answer += data?.choices?.[0]?.delta?.content ?? "";
      });

      for await (const buf of response.body as ReadableStream<Uint8Array> & {
        [Symbol.asyncIterator](): AsyncIterableIterator<Buffer>;
      }) {
        parser.feed(buf.toString("utf-8"));
        updatePrompts(data.conversationId, { answer });
      }

      startTransition(() => {
        updatePrompts(data.conversationId, { answer });
        setPrompt("");
      });

      showToast({
        title: "Ask Markprompt done",
        style: Toast.Style.Success,
      });

      parser.reset();
    },
    execute: false,
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Markprompt-Client": "@markprompt/raycast",
      "X-Markprompt-API-Version": "2023-12-01",
    },
    body: body,
  });

  const actionPanel = isLoading ? null : (
    <ActionPanel>
      <Action
        title="Ask"
        icon={Icon.SpeechBubble}
        onAction={async () => {
          if (prompt === "") return;

          showToast({
            title: "Asking Markprompt…",
            style: Toast.Style.Animated,
          });

          startTransition(() => {
            const tempId = crypto.randomUUID();

            setSelectedPromptId(tempId);
            setPrompts((prev) => [
              {
                id: tempId,
                prompt,
                answer: "",
              },
              ...prev,
            ]);

            mutate();
          });
        }}
      />
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={prompts.length > 0}
      onSearchTextChange={setPrompt}
      searchText={prompt}
      searchBarPlaceholder="Ask Markprompt…"
      throttle={false}
      filtering={false}
      actions={actionPanel}
      selectedItemId={selectedPromptId}
    >
      {prompts && prompts.length > 0 ? (
        prompts.map((x) => (
          <List.Item
            key={x.id}
            id={x.id}
            title={x.prompt.slice(0, 50)}
            actions={actionPanel}
            detail={
              <List.Item.Detail
                markdown={x.answer}
                isLoading={x.prompt === prompt && isLoading}
              />
            }
          />
        ))
      ) : (
        <List.EmptyView
          icon={{
            mask: Image.Mask.RoundedRectangle,
            source: "emptyview-icon.png",
          }}
          title="No questions yet."
          description="Ask the first question to your Markprompt project."
        />
      )}
    </List>
  );
}
