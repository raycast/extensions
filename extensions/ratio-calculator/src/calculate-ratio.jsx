import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";

export default function calculateRatio() {
  const [answers, setAnswers] = useState([]);

  return (
    <List
      searchBarPlaceholder="Enter your ratio here"
      onSearchTextChange={(text) => getEquivalentRatio(text, setAnswers)}
    >
      <List.Section title="Answer">
        {answers.map((answer, index) => (
          <List.Item
            key={index}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Result"
                  content={answer.value ? answer.value.toString() : answer.variable}
                />
                <Action.Paste content={answer.value ? answer.value.toString() : answer.variable} />
              </ActionPanel>
            }
            title={
              answer.value
                ? `${capitalizeFirstLetter(answer.variable)} = ${answer.value.toFixed(2)}`
                : `${answer.variable}`
            }
            icon={
              answer.variable == "True"
                ? Icon.CheckCircle
                : answer.variable == "False"
                ? Icon.XMarkCircle
                : Icon.PlusMinusDivideMultiply
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function getEquivalentRatio(text, setAnswers) {
  const answerList = [];

  let splitEquation = text;

  if (text.split("=").length == 1) {
    splitEquation = text.split(" ");
  } else {
    splitEquation = text.replace(/ /g, "").split("=");
  }

  if (splitEquation.length != 2) {
    return;
  }

  let firstRatio = splitEquation[0].split(/[/:]/g);
  let secondRatio = splitEquation[1].split(/[/:]/g);

  if (firstRatio.length != secondRatio.length || firstRatio.length == 1) {
    return;
  }

  // Runs if the expression contains a variable, otherwise checks if the ratios are equal
  if (secondRatio.some((el) => !isNumber(el)) || firstRatio.some((el) => !isNumber(el))) {
    if (firstRatio.some((el) => !isNumber(el))) {
      [firstRatio, secondRatio] = [secondRatio, firstRatio];
    }

    secondRatio.forEach((number, index) => {
      if (isNumber(number)) {
        return;
      }
      if (firstRatio.length == 2) {
        const nonVarIndex = index - 1 == -1 ? 1 : 0;

        answerList.push({
          variable: number,
          value: (firstRatio[index] / firstRatio[nonVarIndex]) * secondRatio[nonVarIndex],
        });
      } else {
        const indexOfNumber = secondRatio.findIndex((el) => isNumber(el));

        answerList.push({
          variable: number,
          value: secondRatio[indexOfNumber] / (firstRatio[indexOfNumber] / firstRatio[index]),
        });
      }
    });
  } else {
    let areEquivalent = true;
    for (var i = 0; i < firstRatio.length - 1; i++) {
      const decimalRatio = firstRatio[0] / firstRatio[i + 1];
      if (decimalRatio != secondRatio[0] / secondRatio[i + 1]) {
        areEquivalent = false;
      }
    }
    answerList.push({
      variable: capitalizeFirstLetter(areEquivalent.toString()),
      value: "",
    });
  }

  setAnswers(answerList);
}

function capitalizeFirstLetter(text) {
  return text.slice(0, 1).toUpperCase() + text.slice(1);
}

function isNumber(numberString) {
  return !isNaN(Number(numberString));
}
