import { Grid, Detail, Form, showToast, Toast, LaunchProps } from "@raycast/api";
import conjugationFR from "conjugation-fr";

interface ConjugationArguments {
  verb: string;
  mode?: ModeInput;
  tense?: TenseInput;
}

const modes = ["infinitive", "conditional", "subjunctive",  "imperative", "participle"];
const tenses = ["present"
  , "imperfect"
  , "future"
  , "simple-past"
  , "perfect-tense"
  , "pluperfect"
  , "anterior-past"
  , "anterior-future"
  , "conditional-past"
  , "subjunctive-past"
  , "subjunctive-pluperfect"
  , "imperative-present"
  , "imperative-past"
  , "present-participle"
  , "past-participle"];

const structure = {
	infinitive: [
		 "infinitive-present"
	   ],
	indicative: [
		"present",
		"imperfect",
		"future",
		"simple-past",
		"perfect-tense",
		"pluperfect",
		"anterior-past",
		"anterior-future"
	],
	conditional: [
		"present",
		"conditional-past"
	],
	subjunctive: [
		"present",
		"imperfect",
		"subjunctive-past",
		"subjunctive-pluperfect"
	],
	imperative: [
		"imperative-present",
		"imperative-past"
	],
	participle: [
		 "present-participle",
		 "past-participle"
	 ]
};

type ModeInput = typeof modes[number];
type TenseInput = typeof tenses[number];

function generateTenseTable(args: ConjugationArguments) {
  const { verb } = args;
  let tenseTable = "";
  try {
    for (const [mode, tenses] of Object.entries(structure)) {
      for (const tense of tenses) {
        const body = conjugationFR.conjugate(verb, mode ?? "", tense ?? "").filter(record => record.pronounIndex !== -1 );
        if (body.length  === 0) {
          continue
        }
    tenseTable = tenseTable + `**Tense**: ${mode}, ${tense}` + '\n' + `| Pronoun | Verb  |
| ------- | ----- |`
for (const record of body) {
  tenseTable = tenseTable + '\n' + `| ${record.pronoun} | ${record.verb}|`

}
        tenseTable += '\n\n'

      }
      tenseTable +='\n'
    }
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
