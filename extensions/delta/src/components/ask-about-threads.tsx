import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { useAnswerModel } from "../hooks/use-answer-model";
import { isAskableQuestion } from "../lib/threads";
import { QuerySource } from "../lib/types";
import { AnswerModelDropdown } from "./answer-model-dropdown";
import { ChangeModelAction } from "./change-model-action";
import { ThreadAnswer } from "./thread-answer";

/** One-keystroke questions, so most of the time there's nothing to type. */
const QUICK_QUESTIONS: { question: string; icon: Icon }[] = [
  { question: "What was decided?", icon: Icon.CheckCircle },
  { question: "What's left to do?", icon: Icon.BulletPoints },
  { question: "Which files changed and why?", icon: Icon.Document },
];

/**
 * Pushed from a thread's actions, or from an answer as a follow-up on its sources; answers come
 * from the given threads only.
 */
export function AskAboutThreads({ threads }: { threads: QuerySource[] }) {
  const [searchText, setSearchText] = useState("");
  const typed = searchText.trim();
  const title = threads.length === 1 ? threads[0].name : `${threads.length} Threads`;
  const { model, hasChosen, setModel, isLoading: isLoadingModel } = useAnswerModel();

  const quickQuestions = [
    { question: threads.length === 1 ? "Summarize this thread" : "Summarize these threads", icon: Icon.Text },
    ...QUICK_QUESTIONS,
  ];

  const askAction = (question: string) => (
    <ActionPanel>
      <Action.Push
        title="Ask Delta"
        icon={Icon.Stars}
        // The model is visible in the dropdown here, so asking confirms it.
        target={<ThreadAnswer question={question} threads={threads} navigationTitle={title} skipModelChoice />}
        onPush={() => {
          // Remember the model shown in the dropdown, so later questions elsewhere don't ask for one.
          if (!isLoadingModel && !hasChosen) {
            setModel(model).catch((error) => showFailureToast(error, { title: "Couldn't save answer model" }));
          }
        }}
      />
      <ChangeModelAction />
    </ActionPanel>
  );

  return (
    <List
      navigationTitle={`Ask About ${title}`}
      searchBarPlaceholder="Type a question or pick one below"
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<AnswerModelDropdown />}
    >
      {isAskableQuestion(typed) && (
        <List.Section title="Your Question">
          <List.Item title={typed} icon={Icon.Stars} actions={askAction(typed)} />
        </List.Section>
      )}
      <List.Section title="Quick Questions" subtitle={threads.length > 1 ? title : undefined}>
        {quickQuestions.map(({ question, icon }) => (
          <List.Item key={question} title={question} icon={icon} actions={askAction(question)} />
        ))}
      </List.Section>
    </List>
  );
}
