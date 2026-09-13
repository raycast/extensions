import { ActionPanel, getPreferenceValues, List, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { PrimaryAction } from "./actions";
import { FormInputActionSection } from "./actions/form-input";
import { PreferencesActionSection } from "./actions/preferences";
import { useAskConversation } from "./hooks/useAskConversation";
import { useChat } from "./hooks/useChat";
import { DEFAULT_MODEL, useModel } from "./hooks/useModel";
import { useQuestion } from "./hooks/useQuestion";
import { useSelectedModel } from "./hooks/useSelectedModel";
import type { Chat, Conversation, Model } from "./type";
import { buildRawModel, isRawModelSelection } from "./utils/models";
import { showResolvedToast } from "./utils/toast";
import { ChatView } from "./views/chat";
import { ModelDropdown } from "./views/model/dropdown";
import { QuestionForm } from "./views/question/form";

export default function Ask(props: { conversation?: Conversation }) {
  // Ask persists to `recents_v1` — the single source of truth — never to the retired
  // legacy `conversations`/`history` keys. See `useAskConversation` for what this replaced and
  // the deleted-while-open ruling.
  //
  // `props.conversation` is passed so the hook knows this conversation PREDATES the view.
  // It is set if and only if Ask was opened on an existing conversation (from Recents),
  // which is ground truth the hook cannot derive on its own: on a fresh mount its own
  // "have I written yet" ref is `false` either way, and without this argument a
  // pre-existing conversation deleted in Recents was re-added by the next persist. See
  // `hasEverBeenWrittenRef`'s doc for the full mechanism.
  const askConversation = useAskConversation(props.conversation);
  const models = useModel();

  const question = useQuestion({ initialQuestion: "", disableAutoLoad: props.conversation ? true : false });
  // `question.update("")` is what actually empties the controlled search bar (`searchText`
  // below) — see the `clearQuestion` param doc on `useChat` for why this must run inside
  // `ask()` itself rather than at each of `chats.ask`'s call sites.
  const chats = useChat<Chat>(props.conversation ? props.conversation.chats : [], models.availableModels, () =>
    question.update(""),
  );

  const [conversation, setConversation] = useState<Conversation>(
    props.conversation ?? {
      id: uuidv4(),
      chats: [],
      model: DEFAULT_MODEL,
      pinned: false,
      updated_at: "",
      created_at: new Date().toISOString(),
    },
  );

  const [isLoading, setLoading] = useState<boolean>(true);

  // Owns the dropdown's persisted selection (replacing `List.Dropdown`'s `storeValue`,
  // which restored the DISPLAYED value without firing `onChange` — so this state, which
  // the model actually sent to the API is resolved from below, silently disagreed with
  // what the dropdown showed). See THE DROPDOWN RULE on `src/views/model/dropdown.tsx`.
  const { selectedModelId, setSelectedModelId } = useSelectedModel(
    props.conversation ? props.conversation.model.id : "default",
  );

  // Only `push` — `QuestionForm` pops itself on submit, so Ask must not also pop. See the
  // submit callback below.
  const { push } = useNavigation();

  /**
   * Resolves a selection id to the `Model` a request is actually sent with. Extracted so
   * the navigated `QuestionForm`'s submit and the `selectedModelId` effect below cannot
   * drift on what an id means — the effect used to own this logic inline, and any second
   * copy of it is a new way for the displayed model and the sent model to disagree.
   *
   * Falls back to the conversation's current model when the id resolves to nothing (a
   * preset deleted in another window while this form was open), rather than silently
   * sending the default.
   */
  const resolveModel = (modelId: string): Model => {
    const resolved = isRawModelSelection(modelId)
      ? buildRawModel(modelId, models.availableModels, models.data.find((x) => x.id === "default") ?? DEFAULT_MODEL)
      : models.data.find((x) => x.id === modelId);
    return resolved ?? conversation.model;
  };

  /** Guards the auto-open of the full-text form so it fires once per empty conversation. */
  const hasOpenedForEmptyRef = useRef(false);

  useEffect(() => {
    const isEmptyConversation = conversation.chats.length === 0;
    // The empty-conversation open must fire only once: `models.data` transitions from []
    // to populated after mount, and without this guard that second transition pushes a
    // duplicate form, leaving a stale screen behind the first back press. Re-opening as
    // the user types on an existing conversation is intentional and stays ungated.
    const shouldOpen = isEmptyConversation ? !hasOpenedForEmptyRef.current : question.data.length > 0;

    // Read fresh on every effect run (not cached in a useState initializer) so a
    // preference change after mount takes effect on the next render pass rather than
    // requiring a relaunch.
    const isAutoFullInput = getPreferenceValues<Preferences>().isAutoFullInput;

    if (isAutoFullInput && shouldOpen) {
      if (isEmptyConversation) {
        hasOpenedForEmptyRef.current = true;
      }
      push(
        <QuestionForm
          initialQuestion={question.data}
          onSubmit={(question, submittedModelId) => {
            // Resolve from the id the FORM submitted, not from `conversation.model` —
            // this element sits on the navigation stack with the closure it was pushed
            // with, so `conversation.model` here is whatever it was at `push()` time.
            // See THE SUBMIT RULE on `QuestionFormProps.onSubmit`.
            chats.ask(question, resolveModel(submittedModelId));
            // NO `pop()` here. `QuestionForm`'s Submit action pops itself, and popping in
            // both places dismissed TWO screens — taking the user out of Ask entirely
            // instead of back into the conversation they just asked a question in.
            // `QuestionForm` owns its own dismissal; this callback owns only the request.
          }}
          models={models.data}
          availableModels={models.availableModels}
          selectedModel={selectedModelId}
          onModelChange={setSelectedModelId}
        />,
      );
    }

    setLoading(false);
  }, [question.data, models.data]);

  useEffect(() => {
    // One persistence effect, not the previous add-on-mount + update-on-change pair.
    // The mount-time `add` existed to register an EMPTY conversation in the legacy
    // `conversations` key; `recentsStore`'s `persistFilter` blocks zero-chat rows from
    // storage anyway, so that call could only ever be a no-op write — and firing it left
    // the surviving `update` effect looking like the only writer while both raced.
    //
    // `persist` is fire-and-forget here for the same reason the sibling effects are: it
    // is a storage write whose result does not feed rendering. Failures surface on the
    // next Recents mount rather than interrupting a conversation in progress. Errors are
    // swallowed deliberately — an unhandled rejection in an effect would crash the view
    // mid-answer, which is strictly worse than a conversation that failed to file.
    askConversation.persist(conversation).catch(() => {
      // Intentionally silent — see above.
    });
  }, [conversation, askConversation]);

  useEffect(() => {
    // Adopt the stored default only while the user is still on it — otherwise this
    // races the selection effect below and stomps a restored dropdown choice once the
    // model list finishes loading.
    if (selectedModelId !== DEFAULT_MODEL.id) return;

    const defaultUserModel = models.data.find((x) => x.id === DEFAULT_MODEL.id);
    if (!defaultUserModel) return;

    setConversation((previous) => {
      if (previous.chats.length > 0) return previous;
      if (previous.model.id === defaultUserModel.id && previous.model.option === defaultUserModel.option) {
        return previous;
      }
      return { ...previous, model: defaultUserModel, updated_at: new Date().toISOString() };
    });
  }, [models.data, selectedModelId]);

  useEffect(() => {
    // Functional updater, like the sibling effects: `chats.data` ticks every 50ms while
    // streaming, and a closure-captured `conversation` would discard a model change made
    // in the same commit window.
    setConversation((previous) => ({ ...previous, chats: chats.data, updated_at: new Date().toISOString() }));
  }, [chats.data]);

  useEffect(() => {
    // A selection is either a saved preset or a bare model from the live list. Resolve
    // via the functional updater so this doesn't need `conversation` as a dependency.
    setConversation((previous) => {
      const resolvedModel = isRawModelSelection(selectedModelId)
        ? buildRawModel(
            selectedModelId,
            models.availableModels,
            models.data.find((x) => x.id === "default") ?? DEFAULT_MODEL,
          )
        : models.data.find((x) => x.id === selectedModelId);

      if (!resolvedModel || resolvedModel.id === previous.model.id) return previous;

      return { ...previous, model: resolvedModel, updated_at: new Date().toISOString() };
    });
  }, [selectedModelId, models.availableModels, models.data]);

  const getActionPanel = (question: string, model: Model) => (
    <ActionPanel>
      <PrimaryAction title="Get Answer" onAction={() => chats.ask(question, model)} />
      <FormInputActionSection
        initialQuestion={question}
        onSubmit={(question, submittedModelId) => chats.ask(question, resolveModel(submittedModelId))}
        models={models.data}
        availableModels={models.availableModels}
        selectedModel={selectedModelId}
        onModelChange={setSelectedModelId}
      />
      <PreferencesActionSection />
    </ActionPanel>
  );

  return (
    <List
      searchText={question.data}
      isShowingDetail={chats.data.length > 0 ? true : false}
      filtering={false}
      isLoading={isLoading ? isLoading : question.isLoading ? question.isLoading : chats.isLoading}
      onSearchTextChange={question.update}
      throttle={false}
      navigationTitle={"Ask"}
      actions={
        !question.data ? (
          <ActionPanel>
            <FormInputActionSection
              initialQuestion={question.data}
              onSubmit={(question, submittedModelId) => chats.ask(question, resolveModel(submittedModelId))}
              models={models.data}
              availableModels={models.availableModels}
              selectedModel={selectedModelId}
              onModelChange={setSelectedModelId}
            />
            <PreferencesActionSection />
          </ActionPanel>
        ) : (
          getActionPanel(question.data, conversation.model)
        )
      }
      selectedItemId={chats.selectedChatId || undefined}
      searchBarAccessory={
        <ModelDropdown
          models={models.data}
          availableModels={models.availableModels}
          onModelChange={setSelectedModelId}
          selectedModel={selectedModelId}
        />
      }
      onSelectionChange={(id) => {
        if (id !== chats.selectedChatId) {
          chats.setSelectedChatId(id);
        }
      }}
      searchBarPlaceholder={chats.data.length > 0 ? "Ask another question..." : "Ask a question..."}
    >
      <ChatView
        data={chats.data}
        question={question.data}
        setConversation={setConversation}
        use={{ chats }}
        model={conversation.model}
        models={models.data}
        availableModels={models.availableModels}
        selectedModel={selectedModelId}
        onModelChange={setSelectedModelId}
        resolveModel={resolveModel}
        onClearQuestion={() => question.update("")}
        isPinned={!!conversation.pinned_at}
        onPinAnswer={async () => {
          // Pins or unpins the conversation in `recents_v1` — see
          // `useAskConversation.setPinned`. The toast lives here because the hook is
          // storage-only; it reports the real outcome rather than a fixed success string,
          // and a failure keeps its Copy Error action per House Style.
          //
          // Local state is updated on success so the action's own title flips: without it
          // Ask would keep offering "Pin" on a conversation it had just pinned, which is
          // the disagreement with Recents this replaced.
          const next = !conversation.pinned_at;
          try {
            const written = await askConversation.setPinned(conversation, next);
            if (written) {
              setConversation((current) => ({
                ...current,
                pinned: next,
                pinned_at: next ? new Date().toISOString() : undefined,
                unpinned_at: next ? current.unpinned_at : new Date().toISOString(),
              }));
              await showResolvedToast({
                title: next ? "Conversation pinned" : "Conversation unpinned",
                style: Toast.Style.Success,
              });
            } else {
              // The row is gone from `recents_v1` — deleted in Recents while this window
              // stayed open. The write refuses to recreate it (see `setPinned`), so
              // reporting success here would be the UI lying about its state.
              await showResolvedToast({
                title: next ? "Couldn't pin conversation" : "Couldn't unpin conversation",
                message: "It was deleted from Recents.",
                style: Toast.Style.Failure,
              });
            }
          } catch (error) {
            await showFailureToast(error, {
              title: next ? "Couldn't pin conversation" : "Couldn't unpin conversation",
            });
          }
        }}
      />
    </List>
  );
}
