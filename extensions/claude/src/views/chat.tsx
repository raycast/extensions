import { ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import { DestructiveAction, PrimaryAction } from "../actions";
import { CopyActionSection } from "../actions/copy";
import { FormInputActionSection } from "../actions/form-input";
import { PreferencesActionSection } from "../actions/preferences";
import { RegenerateActionSection } from "../actions/regenerate";
import { PinActionSection } from "../actions/pin";
import { Chat, ChatViewProps } from "../type";
import { buildAnswerAccessories } from "../utils";
import { AnswerDetailView } from "./answer-detail";
import { EmptyView } from "./empty";

export const ChatView = ({
  data,
  question,
  model,
  setConversation,
  use,
  models,
  availableModels,
  selectedModel,
  onModelChange,
  resolveModel,
  onPinAnswer,
  isPinned,
  onClearQuestion,
}: ChatViewProps) => {
  // Copy before sorting: `data` is the useChat state array, which Ask persists as
  // `conversation.chats`. An in-place sort reverses the stored transcript — which both
  // mislabels the Conversations row and sends Claude the turns in reverse order.
  const sortedChats = [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Extracted so its position can move: with an empty search bar, this becomes the
  // PANEL'S FIRST action (see below), which Raycast binds to ⏎ regardless of any
  // shortcut prop. There is nothing to submit yet with an empty search bar — a "Get
  // Answer" primary would be a no-op — so the natural ⏎ is the action that OPENS an
  // input, i.e. this one, rather than Copy Answer (the previous, accidental primary).
  const formInputAction = (
    <FormInputActionSection
      initialQuestion={question}
      // Resolve from the id the pushed form submitted, not the captured `model` prop —
      // THE SUBMIT RULE on `QuestionFormProps.onSubmit`.
      onSubmit={(question, submittedModelId) => use.chats.ask(question, resolveModel(submittedModelId))}
      models={models}
      availableModels={availableModels}
      selectedModel={selectedModel}
      onModelChange={onModelChange}
    />
  );

  const getActionPanel = (selectedChat: Chat) => {
    const isSelectedAnsweredChat =
      (selectedChat.question || selectedChat.answer) && use.chats.selectedChatId === selectedChat.id;

    return (
      <ActionPanel>
        {question.length > 0 ? (
          <PrimaryAction title="Get Answer" onAction={() => use.chats.ask(question, model)} />
        ) : isSelectedAnsweredChat ? (
          <>
            {/* Asking a follow-up is the primary action on a selected answer row: it's
                first in the panel, so ⏎ opens Full Text Input (⌘T stays bound to the same
                action, unchanged, for anyone who already knows that shortcut). Copy Answer
                keeps its own `Keyboard.Shortcut.Common.Copy` binding instead of being the ⏎
                default on a view whose whole point is continuing the conversation. */}
            {formInputAction}
            <CopyActionSection answer={selectedChat.answer} question={selectedChat.question} />
            {selectedChat.answer ? <PinActionSection onPinAnswerAction={onPinAnswer} isPinned={isPinned} /> : null}
            {selectedChat.answer ? (
              // Append, not replace — see the append rule in `src/actions/regenerate.tsx`.
              // Resolves the model directly from the submenu item the user picked (via
              // `buildRawModel`/the preset object itself inside `RegenerateActionSection`),
              // never from this closure's captured `model` prop — same principle as THE
              // SUBMIT RULE, applied at the point of selection instead of via an id.
              <RegenerateActionSection
                question={selectedChat.question}
                models={models}
                availableModels={availableModels}
                onRegenerate={(regenerateModel) => use.chats.ask(selectedChat.question, regenerateModel)}
              />
            ) : null}
          </>
        ) : null}
        {/* Rendered here only when the branch above didn't already render it (the empty-
            search, selected-answered-chat case puts it first instead, as the ⏎ action).
            The `question.length > 0` case still gets it after "Get Answer", and the case
            with no selected/answered chat still gets it as the sole action. */}
        {question.length === 0 && isSelectedAnsweredChat ? null : formInputAction}
        {use.chats.data.length > 0 && (
          <ActionPanel.Section title="Restart">
            <DestructiveAction
              title="Start New Conversation"
              icon={Icon.RotateAntiClockwise}
              dialog={{
                title: "Are you sure you want to start a new conversation?",
                primaryButton: "Start New",
              }}
              onAction={() => {
                setConversation({
                  id: uuidv4(),
                  chats: [],
                  model: model,
                  pinned: false,
                  updated_at: "",
                  created_at: new Date().toISOString(),
                });
                use.chats.clear();
                // `clearSearchBar()` was here and did nothing: Ask renders the search field as
                // CONTROLLED (`searchText={question.data}`), so React re-renders the old text
                // straight back. Clearing the state that owns the field is what actually works.
                onClearQuestion();
                use.chats.setLoading(false);
              }}
              shortcut={Keyboard.Shortcut.Common.New}
            />
          </ActionPanel.Section>
        )}
        <PreferencesActionSection />
      </ActionPanel>
    );
  };

  return sortedChats.length === 0 ? (
    <EmptyView />
  ) : (
    <List.Section title="Results" subtitle={data.length.toLocaleString()}>
      {sortedChats.map((sortedChat, i) => {
        return (
          <List.Item
            id={sortedChat.id}
            key={sortedChat.id}
            accessories={buildAnswerAccessories(sortedChat, use.chats.data.length - i)}
            title={sortedChat.question}
            detail={sortedChat.answer && <AnswerDetailView chat={sortedChat} streamData={use.chats.streamData} />}
            actions={use.chats.isLoading ? undefined : getActionPanel(sortedChat)}
          />
        );
      })}
    </List.Section>
  );
};
