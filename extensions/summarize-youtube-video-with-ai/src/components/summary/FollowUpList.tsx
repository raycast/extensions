/* Copy All Q&A would be weirdly formatted otherwise */
/* eslint-disable @raycast/prefer-title-case */
import { Action, ActionPanel, AI, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { FINDING_ANSWER } from "../../const/toast_messages";
import type { Question } from "../../hooks/useQuestions";
import { generateQuestionId } from "../../utils/generateQuestionId";
import { getFollowUpQuestionSnippet } from "../../utils/getAiInstructionSnippets";

type FollowUpListProps = {
  transcript: string;
  questions: Question[];
  onQuestionsUpdate?: (updatedQuestions: Question[]) => void;
};

export default function FollowUpList({
  transcript,
  questions: initialQuestions,
  onQuestionsUpdate,
}: FollowUpListProps) {
  const [question, setQuestion] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState(initialQuestions[0]?.id ?? "");
  const [questions, setQuestions] = useState(initialQuestions);

  const handleAdditionalQuestion = async () => {
    if (!question) return;
    const qID = generateQuestionId();
    const questionText = question;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: FINDING_ANSWER.title,
      message: FINDING_ANSWER.message,
    });

    const answer = AI.ask(getFollowUpQuestionSnippet(questionText, transcript));

    const updatedQuestions = [
      {
        id: qID,
        question: questionText,
        answer: "",
      },
      ...questions,
    ];
    setQuestions(updatedQuestions);
    if (onQuestionsUpdate) {
      onQuestionsUpdate(updatedQuestions);
    }

    setQuestion("");
    let isFirstChunk = true;
    answer.on("data", (data) => {
      if (isFirstChunk) {
        toast.show();
        isFirstChunk = false;
      }
      setQuestions((prevQuestions) => {
        const updatedQuestions = prevQuestions.map((q) => (q.id === qID ? { ...q, answer: q.answer + data } : q));
        if (onQuestionsUpdate) {
          onQuestionsUpdate(updatedQuestions);
        }
        return updatedQuestions;
      });
    });

    answer.finally(() => {
      toast.hide();
      setSelectedQuestionId(qID);

      if (onQuestionsUpdate) {
        setQuestions((currentQuestions) => {
          onQuestionsUpdate(currentQuestions);
          return currentQuestions;
        });
      }
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
