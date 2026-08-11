import { Action, ActionPanel, AI, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
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
  const [questions, setQuestions] = useState(initialQuestions);
  const [selectedQuestionId, setSelectedQuestionId] = useState(initialQuestions[0]?.id ?? "");

  // Sync to parent when questions change
  useEffect(() => {
    onQuestionsUpdate?.(questions);
  }, [questions, onQuestionsUpdate]);

  const handleAdditionalQuestion = async () => {
    if (!question) return;
    const qID = generateQuestionId();
    const questionText = question;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: FINDING_ANSWER.title,
      message: FINDING_ANSWER.message,
    });

    // Extract summary (first item) and previous Q&A (rest)
    const summary = questions[0]?.answer || "";
    const previousQA = questions.slice(1).map((q) => ({ question: q.question, answer: q.answer }));

    const stream = AI.ask(getFollowUpQuestionSnippet(questionText, transcript, summary, previousQA));

    // Add new question to list
    setQuestions((prev) => [{ id: qID, question: questionText, answer: "" }, ...prev]);
    setQuestion("");

    let isFirstChunk = true;

    stream.on("data", (data) => {
      if (isFirstChunk) {
        toast.show();
        isFirstChunk = false;
      }
      setQuestions((prev) => {
        const updated = prev.slice();
        updated[0] = { ...updated[0], answer: updated[0].answer + data };
        return updated;
      });
    });

    stream.finally(() => {
      toast.hide();
      setSelectedQuestionId(qID);
    });
  };

  const copyQuestionsAndAnswers = () => {
    return questions.length
      ? `Questions:\n${questions.map((q) => `Q: ${q.question}\nA: ${q.answer}`).join("\n\n")}`
      : "";
  };

  const copySelectedAnswer = () => {
    const selectedQuestion = questions.find((q) => q.id === selectedQuestionId);
    if (!selectedQuestion) return "";

    return selectedQuestion.id === questions[0]?.id
      ? selectedQuestion.answer
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
          <Action.SubmitForm onSubmit={handleAdditionalQuestion} title="Ask" />
          <Action.CopyToClipboard title="Copy Selected Answer" content={copySelectedAnswer()} />
          <Action.CopyToClipboard title="Copy All Q&A" content={copyQuestionsAndAnswers()} />
        </ActionPanel>
      }
    >
      {questions.map((q) => (
        <List.Item key={q.id} title={q.question} detail={<List.Item.Detail markdown={q.answer} />} id={q.id} />
      ))}
    </List>
  );
}
