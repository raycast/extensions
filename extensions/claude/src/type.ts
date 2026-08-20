import type { AvailableModel } from "./api/models";

export type Set<T> = React.Dispatch<React.SetStateAction<T>>;

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export interface Question {
  id: string;
  question: string;
  created_at: string;
}

export interface Chat extends Question {
  answer: string;
  /**
   * The display name of the model/preset that produced THIS answer — e.g. "Haiku 4.5" or
   * a user's preset name — captured at answer time via `shortModelName`
   * (`src/utils/models.ts`), the same short form the model/preset pickers show. Optional
   * because it did not exist before this field was added: a `Chat` from before this
   * change, or from a `SavedChat`/legacy import that never carried a model, has no way to
   * answer "which model made this."
   *
   * WHY THIS EXISTS: `Conversation.model` is the conversation's CURRENT model — a single
   * value shared by every answer in the transcript, even though "Regenerate Answer with
   * Model…"/"…with Preset…" (`src/actions/regenerate.tsx`) appends a new answer under a
   * DIFFERENT model without changing the conversation's model going forward. Without a
   * per-answer field, two answers to the same question are visually identical in
   * `src/views/chat.tsx`'s list — which is exactly the disambiguation problem Regenerate
   * exists to let the user resolve. `Conversation.model` remains what a NEW question uses;
   * this field records what an EXISTING answer already used.
   *
   * NEVER BACKFILLED FROM `Conversation.model`. An old row with no `answer_model` shows no
   * accessory rather than a guessed one — see `src/views/chat.tsx`'s accessory logic.
   * Inferring it from the conversation's PRESENT model would be actively wrong for any
   * conversation whose model was later changed, which is precisely the ambiguous case the
   * user hit (two identical questions, no way to tell them apart).
   */
  answer_model?: string;
}

export interface SavedChat extends Chat {
  saved_at?: string;
}

/**
 * THE OWNERSHIP INVARIANT (established fix-wave 5; enforced in
 * `src/stores/recentsMigration.ts`'s `RECENTS_OWNED_FIELDS` / `reconcileRecents`).
 *
 * A `Conversation` in `recents_v1` is assembled from TWO sources with different
 * authority, and every field below belongs to exactly one of them:
 *
 * - **LEGACY-DERIVED** (`id`, `model`, `chats`, `created_at`, `updated_at`): re-derived
 *   from the legacy `conversations`/`history`/`savedChats` keys on EVERY Recents mount,
 *   because those keys are never deleted and other commands (Ask) still write to them.
 *   The newer `updated_at` wins these, whole-row. `recents_v1` is a cache of them.
 *
 * - **RECENTS-OWNED** (`archived`, `title`, `pinned_at`, `unpinned_at`, `pinned`): these
 *   exist ONLY on the `recents_v1` copy. No legacy key stores them, so re-derivation can
 *   never produce a truer value than the one already in `recents_v1` — it can only
 *   produce a default that erases a user's decision. They must therefore survive
 *   re-derivation unconditionally, EVEN when the derived row is genuinely newer.
 *
 * Why this is written here and not only in the migration: the whole-row `updated_at`
 * tie-break silently reverted Archive, Rename, and Unpin for every user with legacy data
 * (fix-wave 5's Critical). The root cause was that this split existed only in someone's
 * head. Adding a field to this interface means deciding which side it falls on — if it is
 * set by a Recents action and by nothing in `conversations`/`history`/`savedChats`, it is
 * Recents-owned and MUST be added to `RECENTS_OWNED_FIELDS`.
 */
export interface Conversation {
  id: string;
  model: Model;
  chats: Chat[];
  updated_at: string;
  created_at: string;
  pinned: boolean;
  /** Ordering source of truth for pinning. Replaces `pinned` for sort purposes — a
   *  boolean loses pin order, which Saved Answers relies on (`src/saved.tsx:43-45`).
   *  `pinned` is kept for now so existing callers keep compiling; `!!pinned_at` yields
   *  the boolean for free once callers migrate. Mirrors `SavedChat.saved_at`.
   *  RECENTS-OWNED, but uniquely also DERIVABLE: `savedChats.saved_at` re-derives a
   *  pin on every migration, which is why unpinning needs `unpinned_at` below. */
  pinned_at?: string;
  /** When the user explicitly UNPINNED this conversation. RECENTS-OWNED.
   *
   *  Exists because `pinned_at` is the one field with a legacy source: a migrated
   *  conversation whose answer is still in `savedChats` gets a `pinned_at` re-derived
   *  from `saved_at` on every single Recents mount. Clearing `pinned_at` alone is
   *  therefore not expressible — the next mount just restores it, and such a
   *  conversation could not be unpinned at all.
   *
   *  Resolution: unpin is a TIMESTAMPED decision, not an absence. `reconcileRecents`
   *  compares it against the derived `pinned_at` — the later timestamp wins. So an
   *  unpin defeats an older `saved_at`, while a genuinely newer save (the user saved the
   *  answer again after unpinning) re-pins. `pinned_at` remains additive-only among pins;
   *  `unpinned_at` is what lets a pin be revoked without regressing that rule. */
  unpinned_at?: string;
  /** Whether this conversation is archived. Absent/false means active. Without this
   *  the Recents Status filter (Active/Archived/All) has nothing to filter on.
   *  RECENTS-OWNED — no legacy key carries it. */
  archived?: boolean;
  /** User-assigned title for Rename. Falls back to the first question when absent.
   *  RECENTS-OWNED — no legacy key carries it. */
  title?: string;
}

export interface Model {
  id: string;
  updated_at: string;
  created_at: string;
  name: string;
  prompt: string;
  option: string;
  temperature: string;
  max_tokens: string;
  pinned: boolean;
}

type PromiseFunctionNoArg = () => Promise<void>;
type PromiseFunctionWithOneArg<T> = (arg: T) => Promise<void>;
type PromiseFunctionWithTwoArg<T, V> = (arg_1: T, arg_2: V) => Promise<void>;

interface BaseFunctionHook<T> {
  add: PromiseFunctionWithOneArg<T>;
  remove: PromiseFunctionWithOneArg<T>;
  clear: PromiseFunctionNoArg;
}

interface BaseHook<T> {
  data: T;
  isLoading: boolean;
}

type Hook<T> = BaseHook<T[]> & BaseFunctionHook<T>;

export type QuestionHook = BaseHook<string> & { update: PromiseFunctionWithOneArg<string> };

export type ModelHook = Hook<Model> & {
  update: PromiseFunctionWithOneArg<Model>;
  option: Model["option"][];
  availableModels: AvailableModel[];
};

export interface ChatHook {
  data: Chat[];
  setData: Set<Chat[]>;
  isLoading: boolean;
  setLoading: Set<boolean>;
  selectedChatId: string | null;
  setSelectedChatId: Set<string | null>;
  ask: PromiseFunctionWithTwoArg<string, Model>;
  clear: PromiseFunctionNoArg;
  streamData: Chat | undefined;
}

export interface ChangeModelProp {
  models: Model[];
  selectedModel: string;
  /** Called with the newly selected model id. Deliberately NOT a `Set<string>` (a React
   *  setState dispatch): every consumer calls it with a plain id, and typing it as a
   *  dispatch forced the owner of the selection to be a bare `useState`. It is now a
   *  persistence-owning hook (`useSelectedModel`), which cannot accept a functional
   *  updater — see THE DROPDOWN RULE on `src/views/model/dropdown.tsx`. */
  onModelChange: (modelId: string) => void;
  /** Live model list, used to offer bare models alongside saved presets. */
  availableModels?: AvailableModel[];
}

export interface QuestionFormProps extends ChangeModelProp {
  initialQuestion: string;
  /**
   * THE SUBMIT RULE (fix-wave 6, the third instance of "displayed value ≠ used value").
   *
   * `onSubmit` MUST receive the selected model id as its second argument, and the caller
   * MUST resolve the model from THAT id — never from a variable captured when the form
   * was pushed.
   *
   * The defect this shape prevents: `QuestionForm` is a NAVIGATED view. `src/ask.tsx`
   * pushes it with an `onSubmit` closure, and that closure captures `conversation.model`
   * at `push()` time. Changing the form's dropdown calls `onModelChange` on the PARENT,
   * which re-renders the parent — but the pushed element already on the navigation stack
   * keeps the closure it was created with. Picking "Deep Reasoning" and submitting sent
   * the previous model.
   *
   * Why the signature and not a fix at the call site: this is the same defect class as
   * `ModelDropdown`'s `storeValue` (fixed once, never propagated to this sibling) and the
   * Recents status filter. Fixing a third site by hand would leave a fourth to find. With
   * the id passed as an argument, a call site that ignores it and uses a captured model
   * is visibly doing so, and a call site that wants the correct behavior cannot get it
   * wrong — the value it needs is in its hand, not in its closure.
   *
   * The one-argument shape is deliberately GONE rather than made optional: an optional
   * second parameter would let every existing broken call site keep compiling unchanged,
   * which is precisely the propagation failure this rule exists to stop. `tsc` now
   * rejects a handler that cannot accept the id.
   */
  onSubmit: (question: string, selectedModelId: string) => void;
}

export interface ChatViewProps extends ChangeModelProp {
  data: Chat[];
  question: string;
  model: Model;
  setConversation: Set<Conversation>;
  use: { chats: ChatHook };
  /** Resolves a selection id to the `Model` to send with. Required because `ChatView`
   *  also pushes a `QuestionForm`, and must obey THE SUBMIT RULE (see
   *  `QuestionFormProps.onSubmit`) rather than sending its captured `model` prop. */
  resolveModel: (modelId: string) => Model;
  /** "Pin Conversation" — pins the containing conversation in `recents_v1`. Supplied by Ask
   *  rather than owned here, because the conversation being pinned is Ask's state. See
   *  `useAskConversation`'s `pin` for why saving is a pin now. */
  onPinAnswer: () => void;
  /** Empties the search bar. Supplied by Ask because the field is CONTROLLED there
   *  (`<List searchText={question.data}>`) — Raycast's imperative `clearSearchBar()` is a
   *  no-op against a controlled value, since React re-renders the old text straight back.
   *  Used by "Start New Conversation", which otherwise starts a fresh conversation with the
   *  previous question still sitting in the search bar, looking pre-filled. */
  onClearQuestion: () => void;
}

export interface CSVPrompt {
  name: string;
  prompt: string;
}
