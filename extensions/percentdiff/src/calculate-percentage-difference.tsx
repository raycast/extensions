import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [answers, setAnswers] = useState<string[]>([]);

  return (
    <List
      searchBarPlaceholder="Enter two numbers separated by a space"
      onSearchTextChange={(text) => {
        const hasSpace = text.includes(" ");
        if (!hasSpace) {
          setAnswers([]);
          return;
        }
        const [first, second] = text.split(" ");
        const firstNumber = parseFloat(first);
        const secondNumber = parseFloat(second);
        if (isNaN(firstNumber) || isNaN(secondNumber)) {
          setAnswers([]);
          return;
        }
        const answer = ((secondNumber - firstNumber) / firstNumber) * 100;

        setAnswers([`${answer.toFixed(2)}%`]);
      }}
    >
      <List.Section title="Answer">
        {answers.map((answer, index) => (
          <List.Item
            key={index}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Result" content={answer} />
                <Action.Paste content={answer} />
              </ActionPanel>
            }
            title={answer}
            icon={Icon.PlusMinusDivideMultiply}
          />
        ))}
      </List.Section>
    </List>
  );
}
