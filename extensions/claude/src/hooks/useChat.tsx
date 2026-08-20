import { Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { AvailableModel } from "../api/models";
import type { Chat, ChatHook, Model } from "../type";
import { isBlankAnswer } from "../utils";
import { buildBoundedMessages } from "../utils/contextWindow";
import { getApiKeyToastAction } from "../utils/errors";
import { buildModelRequestParams, nonstreamingRetryParams, shortModelName } from "../utils/models";
import { resolveToast } from "../utils/toast";
import { useAnthropic } from "./useAnthropic";
import { MessageStream } from "@anthropic-ai/sdk/lib/MessageStream";

const STREAM_UPDATE_INTERVAL_MS = 50;

/**
 * Human-readable note appended to the success toast when older turns were left out of
 * the request. Silent trimming would make Claude look like it forgot the conversation —
 * this makes the bound visible as a product limit rather than a model failure.
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
 * Composes the error text with the trim note, so BOTH facts survive on the one shared
 * toast object.
 *
 * The toast is used for two different jobs — "your conversation was trimmed" (set before
 * the request) and "your request failed" (set after) — and the failure handlers assign
 * `toast.message` outright. A user whose long conversation was trimmed AND whose request
 * then failed previously never learned the trimming happened, and would be confused when
 * the retry didn't reference earlier context. Trimming is also a plausible CONTRIBUTOR to
 * some failures, which makes dropping it exactly the wrong fact to lose.
 */
function failureMessageWith(errorMessage: string, trimNote: string | undefined): string {
  return trimNote ? `${errorMessage}\n\n${trimNote}` : errorMessage;
}

export function useChat<T extends Chat>(
  props: T[],
  availableModels: AvailableModel[] = [],
  /**
   * Clears the CONTROLLED search-bar text that owns the asked question (`useQuestion`'s
   * `data`, rendered as `<List searchText={question.data}>` in `src/ask.tsx`).
   *
   * Called from exactly one place — the top of `ask()` below — so every path that can ask
   * a question (the pushed Full Text Input form, the question-bar "Get Answer" action, and
   * Regenerate, which re-asks an existing question via this same `ask()`) clears it by
   * construction. Putting the clear at each of the five call sites instead would work
   * today but silently stop covering a future call site that forgets it.
   *
   * Previously this used Raycast's imperative `clearSearchBar()`, which is a no-op against
   * a CONTROLLED `searchText` — React re-renders `question.data` right back on the next
   * tick, so the asked question stayed in the search bar after the answer arrived. With
   * nothing to signal "you can type a follow-up here," the user read the view as frozen on
   * their old search and pressed Escape — dropping them to the Raycast root instead of
   * asking a follow-up. Clearing the React state that actually owns the field fixes that:
   * once the question is gone, `searchBarPlaceholder` in `src/ask.tsx` already switches to
   * "Ask another question..." (chats.data.length > 0), making the follow-up affordance
   * visible without re-pushing the form or touching Escape's behavior.
   */
  clearQuestion?: () => void,
): ChatHook {
  const [data, setData] = useState<Chat[]>(props);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [streamData, setStreamData] = useState<Chat | undefined>();

  // Ref to track the current stream for cleanup/abort
  const streamRef = useRef<MessageStream | null>(null);
  // Ref for throttled updates
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Tracks the in-flight toast so unmount can dismiss it.
  const toastRef = useRef<Toast | null>(null);

  /**
   * REQUEST IDENTITY (fix-wave 6, MEDIUM 1). Overlapping submissions previously shared
   * one `streamRef` and one `updateIntervalRef` with no notion of *which* request owned
   * them: submitting Q2 while Q1 was still streaming aborted Q1's stream, but Q1's
   * placeholder row — a question with a blank answer — stayed in `data` forever, because
   * an aborted stream fires neither "end" nor "error" and nothing cleaned it up. That
   * blank turn then persisted into the conversation and into the next request's message
   * list.
   *
   * Every `ask()` call takes the next id and stores it here. A callback compares its own
   * captured id against the current value before touching shared state; a stale callback
   * (its request was superseded) does nothing. That is what makes "the newest request
   * owns the shared refs" checkable rather than assumed.
   */
  const requestGenerationRef = useRef(0);
  /** False once unmounted, so a continuation resuming after teardown does nothing. */
  const isMountedRef = useRef(true);

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
      // An aborted stream fires neither "end" nor "error", so the in-flight toast would
      // otherwise animate forever after the view is dismissed (e.g. Escape mid-answer).
      if (toastRef.current) {
        toastRef.current.hide();
        toastRef.current = null;
      }
    };
  }, []);

  async function ask(question: string, model: Model) {
    // Read fresh per request rather than once per mount, so toggling "Stream Responses"
    // in Preferences takes effect on the next question without a relaunch. Captured once
    // into this local so the request build and the streaming callbacks below — which run
    // later, asynchronously — see the same value the request was actually built with,
    // rather than re-reading a preference that may have changed mid-request.
    const useStream = getPreferenceValues<Preferences>().useStream;

    // Claim this request's identity before any async work. Every callback below captures
    // `generation` and checks it against `requestGenerationRef.current` before mutating shared
    // state, so a superseded request can never abort, clear, or overwrite the state of
    // the one that replaced it.
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    /** True while this request is still the newest one AND the view is still mounted. */
    const isCurrent = () => isMountedRef.current && requestGenerationRef.current === generation;

    // See the `clearQuestion` param doc above for why this is here and not at each call
    // site, and why it replaced the no-op `clearSearchBar()` that used to live here.
    clearQuestion?.();
    setLoading(true);

    const toast = await showToast({
      title: "Getting your answer...",
      style: Toast.Style.Animated,
    });
    toastRef.current = toast;

    let chat: Chat = {
      id: uuidv4(),
      question,
      answer: "",
      created_at: new Date().toISOString(),
      // The model this SPECIFIC answer is being asked with — set once here and carried
      // unchanged through every path below (`chat = { ...chat, answer }` and
      // `streamedChat = { ...chat, answer: "" }` both spread it forward). See `Chat` in
      // `src/type.ts` for why this is per-answer rather than read off the conversation.
      answer_model: shortModelName(model.name),
    };

    setData((prev) => {
      return [...prev, chat];
    });

    // Select the new row the moment it's created, not when its answer finishes. The row
    // is visible immediately (sorted to the top by `src/views/chat.tsx`'s newest-first
    // sort) and the user watches it stream in via `AnswerDetailView`'s `streamData` check
    // (`streamData.id === chat.id`) — that comparison only lights up if this row is
    // ALSO the selected one, since `List.Item`'s `detail` only renders for the selected
    // item. Selecting later (e.g. in the `on("end")` handler) would show a blank detail
    // pane for the entire streaming duration and only jump at the very end.
    //
    // Set unconditionally, no identity/`isCurrent()` guard needed: this line runs
    // synchronously inside THIS call to `ask()`, before any `await`. A follow-up question
    // asked while this one is still streaming calls `ask()` again and reaches this same
    // line for its own new row, which naturally overwrites the selection with the newer
    // id — last-writer-wins by construction. Nothing later in this function (or in the
    // superseded request's now-gated callbacks) calls `setSelectedChatId` again, so a
    // stale request can never claw selection back after a newer one already moved it.
    setSelectedChatId(chat.id);

    // Bound the request to a recent-turn window that fits the model's input budget.
    // `data` here is the full transcript (state at call time, before `chat` above was
    // appended) — kept untouched for display; only the request's message list is
    // trimmed. Counted with the API's own countTokens() rather than a character
    // heuristic; a failed count falls back to a conservative turn cap rather than
    // blocking the question (see buildBoundedMessages).
    const availableModel = availableModels.find((m) => m.id === model.option);
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

    // Held in a local as well as on the toast: the failure handlers below overwrite
    // `toast.message` with the error text, and this is what lets them re-compose the note
    // back in rather than silently dropping it (`failureMessageWith`).
    const trimNote = trimmed ? trimmedNoteFor(droppedTurnCount, countFailed) : undefined;
    if (trimNote) {
      toast.message = trimNote;
    }

    if (useStream) {
      // OWNERSHIP GATE (Grepile IMPORTANT) — and it must come FIRST, before the teardown
      // below, which is the subtlety that makes this the whole fix.
      //
      // This entire block runs AFTER `await buildBoundedMessages(...)`, which makes a
      // `countTokens` NETWORK call. So between claiming `generation` at the top of `ask()`
      // and arriving here, another submission may have superseded this request — and if
      // it did, it has already installed ITS stream and interval into the shared refs.
      //
      // A superseded request that fell through to the teardown below would therefore
      // abort the ACTIVE stream (the newer request's, the one the user is watching) and
      // clear the active interval, then install its own stale stream in their place —
      // exactly inverting ownership. Gating here means a request that has lost the race
      // touches nothing: no teardown, no interval, no stream, and no API call issued at
      // all, since `messages.stream()` below is never reached.
      //
      // Every callback further down already checks `isCurrent()`. These pre-callback
      // writes were the ones that did not.
      if (!isCurrent()) {
        // Drop this request's placeholder row. Nothing downstream will do it: no stream
        // is ever created, so neither "end" nor "error" can fire (the same reason the
        // abort path needs explicit cleanup, MEDIUM 1). Without this the superseded
        // question sits in `data` forever with a blank answer.
        setData((prev) => prev.filter((a) => a.id !== chat.id));
        return;
      }

      // Abort any existing stream before starting a new one. The abort is why the
      // superseded request's callbacks never fire ("end"/"error" are not emitted on
      // abort) — so the cleanup that WOULD have run there has to happen here instead,
      // explicitly, or the previous question's placeholder row leaks (MEDIUM 1).
      //
      // Reached only by a request that is still current (gate above), so what it tears
      // down is always a genuinely superseded predecessor — never the active stream.
      if (streamRef.current) {
        streamRef.current.abort();
        streamRef.current = null;
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      // Drop any blank placeholder left behind by the request we just aborted. Matched by
      // "blank answer AND not this request's own row" rather than by a remembered id, so
      // it also sweeps a placeholder from an earlier aborted request that never got
      // cleaned up. A completed answer is never blank, so no real turn can match this.
      setData((prev) => prev.filter((a) => a.id === chat.id || !isBlankAnswer(a.answer)));

      const streamedChat = { ...chat, answer: "" };
      let pendingUpdate = false;

      // Set up throttled UI updates
      const updateInterval = setInterval(() => {
        // A superseded request must stop painting into shared state even if its interval
        // survives a tick longer than the abort above.
        if (!isCurrent()) return;
        if (pendingUpdate) {
          setStreamData({ ...streamedChat });
          setData((prev) => prev.map((a) => (a.id === chat.id ? { ...streamedChat } : a)));
          pendingUpdate = false;
        }
      }, STREAM_UPDATE_INTERVAL_MS);
      updateIntervalRef.current = updateInterval;

      const stream = chatAnthropic.messages.stream({
        ...buildModelRequestParams(model, { streaming: true }),
        messages: [...boundedMessages, { role: "user", content: question }],
      });

      // SECOND GATE — and the ordering here is the point. `messages.stream()` is
      // synchronous, but it issues a request the moment it is called, so the stream
      // OBJECT necessarily exists before we can ask whether we are still allowed to own
      // it. A request superseded during that window must therefore ABORT what it just
      // created rather than simply declining to install it: an un-installed stream is
      // unreachable by every other code path here (nothing else holds a reference), so
      // returning without aborting would leak a live request that runs to completion
      // invisibly. The interval is cleared by handle, not through the ref, for the same
      // reason — the ref may already belong to the newer request, and clearing through it
      // would kill the wrong one.
      if (!isCurrent()) {
        stream.abort();
        clearInterval(updateInterval);
        // Only relinquish the shared refs if they are still OURS. A newer request that
        // installed between our two gates owns them now, and nulling them here would
        // strand its stream and its interval — the same class of cross-request damage
        // this gate exists to prevent, merely inverted.
        if (updateIntervalRef.current === updateInterval) updateIntervalRef.current = null;
        setData((prev) => prev.filter((a) => a.id !== chat.id));
        return;
      }

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
          // A superseded request owns none of the shared refs, the toast, or `isLoading`
          // any more — the request that replaced it does. Returning here is what stops a
          // late finisher from clearing the newer request's interval or flipping its
          // loading state off mid-answer.
          if (!isCurrent()) return;
          // Clear the update interval
          if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
          }
          // Flush any pending update to ensure last chunk is rendered
          if (pendingUpdate) {
            setStreamData({ ...streamedChat });
          }
          setStreamData(undefined);
          streamRef.current = null;
          setLoading(false);
          // Terminal state reached: unmount no longer needs to dismiss this toast.
          toastRef.current = null;

          // A stream can reach "end" having emitted nothing but whitespace (or nothing at
          // all). Persisting that would put a blank assistant turn in History and in the
          // next request's message list — the same defect the error handler already
          // guards. Same `isBlankAnswer` rule at all three sites, deliberately.
          if (isBlankAnswer(streamedChat.answer)) {
            setData((prev) => prev.filter((a) => a.id !== chat.id));
            // Hide-and-reshow rather than mutating the live toast — see
            // `src/utils/toast.ts`. A real streaming request has genuine latency, so the
            // Animated phase stays; only the RESOLUTION step changes.
            resolveToast(toast, {
              title: "Claude returned an empty answer",
              message: failureMessageWith("Nothing was saved. Try asking again.", trimNote),
              style: Toast.Style.Failure,
              primaryAction: {
                title: "Copy Error",
                onAction: async () => {
                  await Clipboard.copy("Claude returned an empty answer for this question.");
                },
              },
            });
            return;
          }

          // Final update with complete answer. This `setData` is the ONLY persistence
          // step: `src/ask.tsx` mirrors `chats.data` into `conversation.chats`, which
          // `useAskConversation` writes to `recents_v1`. There is deliberately no second,
          // flat write of the answer — see `useAskConversation`'s docstring for why the
          // separate `history` concept no longer exists.
          setData((prev) => prev.map((a) => (a.id === chat.id ? { ...streamedChat } : a)));
          resolveToast(toast, { title: "Got your answer!", style: Toast.Style.Success });
        })
        .on("error", (err) => {
          // Same identity gate as "end" above. An abort does not emit "error", but a
          // superseded request can still fail on its own for an unrelated reason, and its
          // failure toast must not overwrite the newer request's in-flight one.
          if (!isCurrent()) return;
          // Clear the update interval
          if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
          }
          streamRef.current = null;
          // Drop the placeholder turn: a failed stream leaves a question with a blank
          // answer, which renders as an empty result and would be sent as an empty
          // assistant turn on the next request. `isBlankAnswer` (not `!answer`) because a
          // stream that errored after emitting only whitespace is exactly as empty, and
          // would otherwise survive into the next request's message list.
          if (isBlankAnswer(streamedChat.answer)) {
            setData((prev) => prev.filter((a) => a.id !== chat.id));
          }
          setStreamData(undefined);
          const errorMessage = err instanceof Error ? err.message : String(err);
          // Hide-and-reshow rather than mutating the live toast — see
          // `src/utils/toast.ts`. A stuck-spinning FAILURE toast is worse than a stuck
          // success one: the user can't tell whether it's still retrying.
          resolveToast(toast, {
            title: "Couldn't get an answer",
            message: failureMessageWith(errorMessage, trimNote),
            style: Toast.Style.Failure,
            primaryAction: {
              title: "Copy Error",
              onAction: async () => {
                await Clipboard.copy(errorMessage);
              },
            },
            secondaryAction: getApiKeyToastAction(errorMessage),
          });
          setLoading(false);
          toastRef.current = null;
        });
    } else {
      // SAME OWNERSHIP GATE AS THE STREAMING PATH, and the audit that produced it: this
      // branch touches NO shared refs — it never assigns `streamRef` or
      // `updateIntervalRef` — so it never had the ref-ownership inversion the streaming
      // path did, and every state write it does make (`setLoading`, `toastRef`, `setData`)
      // was already behind an `isCurrent()` check.
      //
      // What it did have is a superseded request still ISSUING its API call and then
      // throwing the answer away, because the only gates sat AFTER `create()`. Bailing
      // here instead costs the user nothing they wanted and saves a billed request for a
      // question they have already moved past. The placeholder is dropped for the same
      // reason the streaming gate drops it — nothing downstream will run to clean it up.
      if (!isCurrent()) {
        setData((prev) => prev.filter((a) => a.id !== chat.id));
        return;
      }

      // Tracks whether the request actually produced an answer, so a failure doesn't
      // persist a blank turn.
      let succeeded = true;

      // `messages.create()` validates the non-streaming token ceiling BEFORE it returns a
      // promise, so that failure throws synchronously and a `.catch()` chained onto the
      // call never sees it. `ask()` is called without `await` from every caller, so an
      // escaping throw becomes an unhandled rejection and the UI is simply abandoned: the
      // toast spins on "Getting your answer..." forever and isLoading is never cleared.
      // Running it inside an async function converts that into a rejection `.catch()` sees.
      const requestParams = buildModelRequestParams(model, { streaming: false });
      const messages = [...boundedMessages, { role: "user" as const, content: question }];
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
          // Non-streaming has no abort handle, so a superseded request always runs to
          // completion. The identity gate is what keeps its result from overwriting the
          // newer request's toast and loading state; its own row is dropped below.
          if (!isCurrent()) return;
          if ("content" in res) {
            // content is a union of block types; only text blocks carry `text`.
            const answer = res.content
              .filter((block): block is Extract<typeof block, { type: "text" }> => block.type === "text")
              .map((block) => block.text)
              .join("");
            chat = { ...chat, answer };
          }

          // Resolution is deliberately NOT done here: the empty-answer branch below
          // (`succeeded && isBlankAnswer(chat.answer)`) must overwrite this outcome with
          // a Failure toast instead, and resolving twice would flash Success then
          // immediately Failure. The single resolve happens once, after `succeeded` is
          // known — see below.
          setLoading(false);
          toastRef.current = null;
        })
        .catch((err) => {
          succeeded = false;
          if (!isCurrent()) return;
          const errorMessage = err instanceof Error ? err.message : String(err);
          // Hide-and-reshow rather than mutating the live toast — see
          // `src/utils/toast.ts`. A stuck-spinning FAILURE toast is worse than a stuck
          // success one: the user can't tell whether it's still retrying.
          resolveToast(toast, {
            title: "Couldn't get an answer",
            message: failureMessageWith(errorMessage, trimNote),
            style: Toast.Style.Failure,
            primaryAction: {
              title: "Copy Error",
              onAction: async () => {
                await Clipboard.copy(errorMessage);
              },
            },
            secondaryAction: getApiKeyToastAction(errorMessage),
          });
          setLoading(false);
          toastRef.current = null;
        });

      // A superseded non-streaming request drops its own placeholder and contributes
      // nothing else: its answer belongs to a question the user has already moved past,
      // and appending it would reorder the transcript around the newer turn.
      if (!isCurrent()) {
        setData((prev) => prev.filter((a) => a.id !== chat.id));
        return;
      }

      // Update data only for non-streaming mode (streaming mode handles this in the
      // on("end") handler). As above, this is the only persistence step — the answer
      // reaches storage via Ask's `recents_v1` write, not a second flat list.
      //
      // The toast resolves exactly ONCE, here (or in `.catch` above, mutually exclusive
      // with this — `succeeded` is `false` on that path and neither branch below runs).
      // Hide-and-reshow rather than mutating the live toast — see `src/utils/toast.ts`.
      if (succeeded && !isBlankAnswer(chat.answer)) {
        setData((prev) => {
          return prev.map((a) => {
            if (a.id === chat.id) {
              return chat;
            }
            return a;
          });
        });
        resolveToast(toast, { title: "Got your answer!", style: Toast.Style.Success });
      } else if (succeeded) {
        // The request succeeded but produced no usable text — an API response whose only
        // text block is whitespace (or a response carrying no text block at all). This
        // path previously persisted the placeholder unconditionally, so the blank turn
        // reached storage and then the next request's message list. Drop it and tell the
        // user, rather than showing a success toast over an empty answer.
        setData((prev) => prev.filter((a) => a.id !== chat.id));
        resolveToast(toast, {
          title: "Claude returned an empty answer",
          message: failureMessageWith("Nothing was saved. Try asking again.", trimNote),
          style: Toast.Style.Failure,
          primaryAction: {
            title: "Copy Error",
            onAction: async () => {
              await Clipboard.copy("Claude returned an empty answer for this question.");
            },
          },
        });
      } else {
        // Drop the placeholder rather than leaving a question with a blank answer behind —
        // it would render as an empty result and pollute History.
        setData((prev) => prev.filter((a) => a.id !== chat.id));
      }
    }
  }

  const clear = useCallback(async () => {
    setData([]);
  }, [setData]);

  return useMemo(
    () => ({ data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData }),
    [data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData],
  );
}
