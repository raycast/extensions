import { getPreferenceValues, clearSearchBar, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, Model } from "../type";
import { getCachedModels } from "../api/models";
import { buildBoundedMessages } from "../utils/contextWindow";
import { buildModelRequestParams, nonstreamingRetryParams } from "../utils/models";
import { useAnthropic } from "./useAnthropic";
import { useHistory } from "./useHistory";
import { MessageStream } from "@anthropic-ai/sdk/lib/MessageStream";

const STREAM_UPDATE_INTERVAL_MS = 50;

/**
 * Human-readable note shown when older turns were left out of the request. Silent
 * trimming would make Claude look like it forgot the conversation — this makes the bound
 * visible as a product limit rather than a model failure.
 */
function trimmedNoteFor(droppedTurnCount: number, countFailed: boolean): string {
  const subject = `the oldest ${droppedTurnCount} turn${droppedTurnCount === 1 ? "" : "s"} of this conversation ${
    droppedTurnCount === 1 ? "wasn't" : "weren't"
  } sent`;
  // Two different causes reach this note and they are not interchangeable. Attributing a
  // failed token count to context length would be a plain lie about why turns went
  // missing, and it is the caption a user would act on by pruning a conversation that
  // was never too long in the first place.
  return countFailed
    ? `Note: ${subject} — the token count for this conversation couldn't be checked, so a conservative amount was kept.`
    : `Note: ${subject} — it's getting long for this model's context window.`;
}

/**
 * Composes error text with the trim note so both survive on the one shared toast. The
 * failure handlers assign `toast.message` outright, which would otherwise discard the
 * note precisely when it best explains the failure.
 */
function failureMessageWith(trimNote: string | undefined, error: string): string {
  return trimNote ? `${error}\n\n${trimNote}` : error;
}

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

  // Ref to track the current stream for cleanup/abort
  const streamRef = useRef<MessageStream | null>(null);
  // Ref for throttled updates
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  /**
   * Monotonic id for the most recently submitted question.
   *
   * `ask()` now awaits a cache read and a `countTokens()` round trip BEFORE it touches
   * the shared stream refs, and those awaits can finish out of order. Without a claim
   * taken before the first await, a slower earlier question resumes last, treats the
   * newer in-flight stream as "the existing one", aborts it, and installs itself — so
   * the question the user asked first wins and the newer one is abandoned. Ordering by
   * arrival is not something the network will do for us.
   */
  const requestGenerationRef = useRef(0);
  /** False once unmounted, so a continuation resuming after teardown does nothing. */
  const isMountedRef = useRef(true);

  const history = useHistory();
  const chatAnthropic = useAnthropic();

  // Cleanup stream on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.abort();
        streamRef.current = null;
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, []);

  async function ask(question: string, model: Model) {
    // Claimed BEFORE any await, so ownership is decided by submission order rather than
    // by whichever token count happens to come back first.
    const generation = ++requestGenerationRef.current;
    const isCurrent = () => isMountedRef.current && requestGenerationRef.current === generation;

    clearSearchBar();
    setLoading(true);

    const toast = await showToast({
      title: "Getting your answer...",
      style: Toast.Style.Animated,
    });

    let chat: Chat = {
      id: uuidv4(),
      question,
      answer: "",
      created_at: new Date().toISOString(),
    };

    setData((prev) => {
      return [...prev, chat];
    });

    // Bound the request to the model's input budget. The full transcript stays intact for
    // display — only what goes to the API is trimmed. Reads the cached model list rather
    // than threading it through every caller; when it is absent the bound falls back to a
    // conservative default window rather than blocking the question.
    const cachedModels = await getCachedModels();
    const availableModel = cachedModels?.find((m) => m.id === model.option);
    const {
      messages: boundedMessages,
      trimmed,
      droppedTurnCount,
      countFailed,
    } = await buildBoundedMessages({
      chats: data,
      question,
      model,
      availableModel,
      countTokens: (params) => chatAnthropic.messages.countTokens(params),
    });

    const trimNote = trimmed ? trimmedNoteFor(droppedTurnCount, countFailed) : undefined;
    if (trimNote) {
      toast.message = trimNote;
    }

    const messages = [...boundedMessages, { role: "user" as const, content: question }];

    // Everything above this line is preparation and touches nothing shared. Everything
    // below claims the stream refs or issues a request, so a superseded or unmounted
    // continuation must stop here — before it can abort the stream a newer question
    // already installed, or resurrect state on a torn-down view.
    if (!isCurrent()) {
      if (isMountedRef.current) {
        // Nothing downstream will ever complete this row: no request is issued, so no
        // handler fires to fill it in. Drop it rather than leave a blank question behind.
        setData((prev) => prev.filter((a) => a.id !== chat.id));
      }
      return;
    }

    if (useStream) {
      // Abort any existing stream before starting a new one
      if (streamRef.current) {
        streamRef.current.abort();
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }

      const streamedChat = { ...chat, answer: "" };
      let pendingUpdate = false;

      // Set up throttled UI updates
      updateIntervalRef.current = setInterval(() => {
        if (pendingUpdate) {
          setStreamData({ ...streamedChat });
          setData((prev) => prev.map((a) => (a.id === chat.id ? { ...streamedChat } : a)));
          pendingUpdate = false;
        }
      }, STREAM_UPDATE_INTERVAL_MS);

      const stream = chatAnthropic.messages.stream({
        ...buildModelRequestParams(model, { streaming: true }),
        messages,
      });

      streamRef.current = stream;

      stream
        // `abort()` emits "abort", not "error", and the SDK rejects an internal promise
        // when nothing is listening for it — an unhandled rejection every time a question
        // supersedes an in-flight one. Listening is enough to defuse it.
        .on("abort", () => {
          /* superseded or unmounted; the "end" guard below handles the state */
        })
        .on("text", (res) => {
          streamedChat.answer += res;
          pendingUpdate = true;
        })
        .on("end", () => {
          // An aborted stream still emits "end". Without this guard the superseded
          // request would commit its partial answer, flip the toast to Success, clear
          // isLoading while the newer request is still running, and null out streamRef —
          // which by then holds the NEW stream, leaving it un-abortable.
          if (streamRef.current !== stream) return;
          // Clear the update interval
          if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
          }
          // Flush any pending update to ensure last chunk is rendered
          if (pendingUpdate) {
            setStreamData({ ...streamedChat });
          }
          // Final update with complete answer
          setData((prev) => prev.map((a) => (a.id === chat.id ? { ...streamedChat } : a)));
          setStreamData(undefined);
          streamRef.current = null;
          history.add({ ...streamedChat });
          setLoading(false);
          toast.title = "Got your answer!";
          toast.style = Toast.Style.Success;
        })
        .on("error", (err) => {
          // Same ownership guard as "end": a superseded stream must not overwrite the
          // active request's toast or clear its loading state.
          if (streamRef.current !== stream) return;
          // Clear the update interval
          if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
          }
          streamRef.current = null;
          toast.title = "Error";
          toast.message = failureMessageWith(trimNote, `Couldn't stream message: ${err}`);
          toast.style = Toast.Style.Failure;
          setLoading(false);
        });
    } else {
      // `messages.create()` validates the non-streaming token ceiling BEFORE it returns a
      // promise, so that failure throws synchronously and a `.catch()` chained onto the
      // call never sees it. `ask()` is called without `await` from every caller, so an
      // escaping throw becomes an unhandled rejection and the UI is simply abandoned:
      // the toast spins on "Getting your answer..." forever and isLoading is never
      // cleared. Running it inside an async function converts that into a rejection the
      // `.catch()` below does see.
      const requestParams = buildModelRequestParams(model, { streaming: false });
      const createNonStreaming = async () => {
        try {
          return await chatAnthropic.messages.create({ ...requestParams, messages });
        } catch (error) {
          // The SDK also enforces a per-model ceiling it does not expose, so the only way
          // to know is to be told. The rejection happens before the request leaves the
          // process, so this retry costs no round trip.
          const retryParams = nonstreamingRetryParams(requestParams, error);
          if (!retryParams) throw error;
          return await chatAnthropic.messages.create({ ...retryParams, messages });
        }
      };

      await createNonStreaming()
        .then(async (res) => {
          if ("content" in res) {
            // `content` is a union of block types and only text blocks carry `text`, so
            // indexing [0].text is unsound — a leading thinking block would break it.
            const answer = res.content
              .filter((block): block is Extract<typeof block, { type: "text" }> => block.type === "text")
              .map((block) => block.text)
              .join("");
            chat = { ...chat, answer };
          }

          // The toast and the loading flag are SHARED, so only the current request may
          // touch them. A non-streaming request is never aborted, so an earlier one that
          // finishes after a newer question was asked would otherwise announce "Got your
          // answer!" and clear loading while the newer answer is still generating.
          if (!isCurrent()) return;
          toast.title = "Got your answer!";
          toast.style = Toast.Style.Success;
          setLoading(false);
        })
        .catch((err) => {
          // Same ownership rule: a superseded request's failure must not replace the
          // live request's toast or stop its spinner.
          if (!isCurrent()) return;
          toast.title = "Error";
          if (err instanceof Error) {
            toast.message = failureMessageWith(trimNote, err.message);
          }
          toast.style = Toast.Style.Failure;
          setLoading(false);
        });

      // Its OWN row and history entry are not shared state — the answer really did
      // arrive and the row for this question already exists — so a superseded request
      // still fills them in. Only a torn-down view is skipped.
      if (isMountedRef.current) {
        // Update data and history only for non-streaming mode
        // (streaming mode handles this in the on("end") handler)
        setData((prev) => {
          return prev.map((a) => {
            if (a.id === chat.id) {
              return chat;
            }
            return a;
          });
        });

        history.add(chat);
      }
    }
  }

  const clear = useCallback(async () => {
    setData([]);
  }, [setData]);

  return useMemo(
    () => ({ data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData }),
    [data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData]
  );
}
