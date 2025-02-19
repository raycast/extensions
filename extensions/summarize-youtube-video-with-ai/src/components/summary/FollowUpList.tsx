/* Copy All Q&A would be weirdly formatted otherwise */
/* eslint-disable @raycast/prefer-title-case */
import { Action, ActionPanel, AI, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { v4 as uuid } from "uuid";
import { FINDING_ANSWER } from "../../const/toast_messages";
import { Question } from "../../hooks/useQuestions";
import { getFollowUpQuestionSnippet } from "../../utils/getAiInstructionSnippets";

type FollowUpListProps = {
  transcript: string;
  questions: Question[];
};

export default function FollowUpList({ transcript, questions: initialQuestions }: FollowUpListProps) {
  const [question, setQuestion] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState(initialQuestions[0]?.id ?? "");
  const [questions, setQuestions] = useState(
    initialQuestions[0]?.question === "Initial Summary of the video"
      ? initialQuestions
      : [
          {
            id: uuid(),
            question: "Initial Summary of the video",
            answer: initialQuestions[0]?.answer ?? "",
          },
          ...initialQuestions.slice(1),
        ],
  );

  const handleAdditionalQuestion = async () => {
    if (!question) return;
    const qID = uuid();

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: FINDING_ANSWER.title,
      message: FINDING_ANSWER.message,
    });

    const answer = AI.ask(getFollowUpQuestionSnippet(question, transcript));

    setQuestions((prevQuestions) => [
      {
        id: qID,
        question,
        answer: "",
      },
      ...prevQuestions,
    ]);

    let isFirstChunk = true;
    answer.on("data", (data) => {
      if (isFirstChunk) {
        toast.show();
        isFirstChunk = false;
      }
      setQuestions((prevQuestions) => prevQuestions.map((q) => (q.id === qID ? { ...q, answer: q.answer + data } : q)));
    });

    answer.finally(() => {
      toast.hide();
      setQuestion("");
      setSelectedQuestionId(qID);
    });
  };

  const copyQuestionsAndAnswers = () => {
    const followUps = questions.length
      ? `Questions:\n${questions.map((q) => `Q: ${q.question}\nA: ${q.answer}`).join("\n\n")}`
      : "";

    return `${followUps}`;
  };

  const copySelectedAnswer = () => {
    const selectedQuestion = questions.find((q) => q.id === selectedQuestionId);
    if (!selectedQuestion) return "";

    return selectedQuestion.id === questions[0]?.id
      ? selectedQuestion.answer // Just return the summary without Q/A format
      : `Q: ${selectedQuestion.question}\nA: ${selectedQuestion.answer}`;
  };

  return (
    <List
      filtering={false}
      isShowingDetail
      navigationTitle="Additional Questions"
      onSearchTextChange={setQuestion}
      searchText={question}
      searchBarPlaceholder="Ask another question"
      selectedItemId={selectedQuestionId}
      searchBarAccessory={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleAdditionalQuestion} />
          <Action.CopyToClipboard title="Copy Selected Answer" content={copySelectedAnswer()} />
          <Action.CopyToClipboard title="Copy All Q&A" content={copyQuestionsAndAnswers()} />
        </ActionPanel>
      }
    >
      {questions.map((question) => (
        <List.Item
          key={question.id}
          title={question.question}
          detail={<List.Item.Detail markdown={question.answer} />}
          id={question.id}
        />
      ))}
    </List>
  );
}
