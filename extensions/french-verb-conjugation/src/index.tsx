import { Grid, Detail, Form, showToast, Toast, LaunchProps } from "@raycast/api";
import conjugationFR from "conjugation-fr";

interface ConjugationArguments {
  verb: string;
  mode?: ModeInput;
  tense?: TenseInput;
}

type ModeInput = "infinitive" | "conditional" | "subjunctive" | "imperative" | "participle";
type TenseInput =
  | "present"
  | "imperfect"
  | "future"
  | "simple-past"
  | "perfect-tense"
  | "pluperfect"
  | "anterior-past"
  | "anterior-future"
  | "conditional-past"
  | "subjunctive-past"
  | "subjunctive-pluperfect"
  | "imperative-present"
  | "imperative-past"
  | "present-participle"
  | "past-participle";

function generateTenseTable(args: ConjugationArguments) {
  const { verb, mode, tense } = args;
  let tenseTable = "";
  try {
    const body = conjugationFR.conjugate(verb, mode ?? "", tense ?? "");
    tenseTable = `| Pronoun | Verb  |
| ------- | ----- |
| ${body[0].pronoun} | ${body[0].verb}|
| ${body[1].pronoun} | ${body[1].verb}|
| ${body[2].pronoun} | ${body[2].verb}|
| ${body[3].pronoun} | ${body[3].verb}|
| ${body[4].pronoun} | ${body[4].verb}|
| ${body[5].pronoun} | ${body[5].verb}|`;
  } catch (error) {
    if (error instanceof Error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
      return error.message;
    } else {
      return "unknown error has occurred";
    }
  }
  return tenseTable;
}

export default function Command(props: LaunchProps<{ arguments: ConjugationArguments }>) {
  const markdown = generateTenseTable(props.arguments);

  return <Detail markdown={markdown} />;
}
