import React, { useState } from "react";
import { Action, ActionPanel, Form, useNavigation, showToast, Toast, List, Icon, Color } from "@raycast/api";
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

  const getGenderInfo = (gender: string) => {
    return {
      icon: {
        source: gender === "male" ? Icon.Male : Icon.Female,
        tintColor: gender === "male" ? Color.Blue : Color.Magenta,
      },
      text: gender.charAt(0).toUpperCase() + gender.slice(1),
    };
  };

  const getConfidenceInfo = (score: number) => {
    if (score < 50) {
      return {
        icon: { source: Icon.EmojiSad, tintColor: Color.Red },
        text: `${score}% - Low confidence`,
      };
    } else if (score < 90) {
      return {
        icon: { source: Icon.EmojiSad, tintColor: Color.Yellow },
        text: `${score}% - Medium confidence`,
      };
    } else {
      return {
        icon: { source: Icon.Emoji, tintColor: Color.Green },
        text: `${score}% - High confidence`,
      };
    }
  };

  const genderInfo = getGenderInfo(result.gender);
  const confidenceInfo = getConfidenceInfo(confidenceScore);

  return (
    <List>
      <List.Item title={name} subtitle="Name" />
      <List.Item icon={genderInfo.icon} title={genderInfo.text} subtitle="Gender" />
      <List.Item icon={confidenceInfo.icon} title={confidenceInfo.text} subtitle="Confidence" />
    </List>
  );
}
