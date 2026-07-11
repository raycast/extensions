import React, { useState } from "react";
import { Action, ActionPanel, Form, useNavigation, showToast, Toast, Detail, Icon, Color } from "@raycast/api";
import { guessGender, GenderResponse } from "./api-client";

interface FormValues {
  name: string;
}

export default function GuessGender() {
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const result = await guessGender(values.name);
      push(<ResultView result={result} name={values.name} />);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Enter name to guess gender" />
    </Form>
  );
}

function ResultView({ result, name }: { result: GenderResponse; name: string }) {
  const confidenceScore = Math.floor(result.confidence * 100);

  const getGenderIcon = (gender: string) => {
    return gender === "male" ? Icon.Male : Icon.Female;
  };

  const getGenderColor = (gender: string) => {
    return gender === "male" ? Color.Blue : Color.Magenta;
  };

  const getConfidenceIcon = (score: number) => {
    return score >= 90 ? Icon.Emoji : Icon.EmojiSad;
  };

  const getConfidenceColor = (score: number) => {
    if (score < 50) return Color.Red;
    if (score < 90) return Color.Yellow;
    return Color.Green;
  };

  const getConfidenceDescription = (score: number) => {
    if (score < 50) return "Low confidence";
    if (score < 90) return "Medium confidence";
    return "High confidence";
  };

  const markdown = `
# Gender Guess Results

Name: ${name}

Results:
- Gender: ![${result.gender}](${getGenderIcon(result.gender)}?tint=${getGenderColor(
    result.gender
  )}&width=32&height=32) ${result.gender.charAt(0).toUpperCase() + result.gender.slice(1)}
- Confidence: ![${confidenceScore >= 90 ? "High" : "Low"} Confidence](${getConfidenceIcon(
    confidenceScore
  )}?tint=${getConfidenceColor(confidenceScore)}&width=32&height=32) ${confidenceScore}% - ${getConfidenceDescription(
    confidenceScore
  )}
  `;

  return <Detail markdown={markdown} />;
}
