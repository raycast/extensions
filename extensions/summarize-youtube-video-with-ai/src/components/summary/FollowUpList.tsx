import { Action, ActionPanel, AI, List } from "@raycast/api";
import { useState } from "react";
import { v4 as uuid } from "uuid";
import { getFollowUpQuestionSnippet } from "../../utils/getAiInstructionSnippets";

type FollowUpListProps = {
  summary?: string;
  transcript?: string;
};

export default function FollowUpList({ summary, transcript }: FollowUpListProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [questions, setQuestions] = useState([
    {
      id: uuid(),
      question: "Initial Summary of the video",
      answer: summary,
    },
  ]);

  const handleAdditionalQuestion = () => {
    if (!searchText || !transcript) return;
    const qID = uuid();

    const answer = AI.ask(getFollowUpQuestionSnippet(searchText, transcript));

    setQuestions((prevQuestions) => [
      {
        id: qID,
        question: searchText,
        answer: "",
      },
      ...prevQuestions,
    ]);

    answer.on("data", (data) => {
      setQuestions((prevQuestions) =>
        prevQuestions.map((question) =>
          question.id === qID ? { ...question, answer: question.answer + data } : question,
        ),
      );
    });

    setSearchText("");
    setSelectedItemId(qID);
  };

  return (
    <List
      filtering={false}
      isShowingDetail
      navigationTitle="Additional Questions"
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder="Ask another question"
      selectedItemId={selectedItemId}
      searchBarAccessory={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleAdditionalQuestion} />
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
