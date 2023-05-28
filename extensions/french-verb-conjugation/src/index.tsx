import { showToast, Toast, LaunchProps, List, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";
import conjugationFR from "conjugation-fr";

interface ConjugationArguments {
  verb: string;
  mode?: ModeInput;
  tense?: TenseInput;
}

const modes = ["infinitive", "conditional", "subjunctive", "imperative", "participle"];
const tenses = [
  "present",
  "imperfect",
  "future",
  "simple-past",
  "perfect-tense",
  "pluperfect",
  "anterior-past",
  "anterior-future",
  "conditional-past",
  "subjunctive-past",
  "subjunctive-pluperfect",
  "imperative-present",
  "imperative-past",
  "present-participle",
  "past-participle",
];

const structure = {
  infinitive: ["infinitive-present"],
  indicative: [
    "present",
    "imperfect",
    "future",
    "simple-past",
    "perfect-tense",
    "pluperfect",
    "anterior-past",
    "anterior-future",
  ],
  conditional: ["present", "conditional-past"],
  subjunctive: ["present", "imperfect", "subjunctive-past", "subjunctive-pluperfect"],
  imperative: ["imperative-present", "imperative-past"],
  participle: ["present-participle", "past-participle"],
};

type ModeInput = (typeof modes)[number];
type TenseInput = (typeof tenses)[number];

function generateTenseTable(args: ConjugationArguments) {
  const { verb, tense, mode } = args;
  let output: any = [];
  try {
    if (tense !== "" || mode !== "") {
      output = generateTenseConjugationDict({ verb, mode, tense });
    } else {
      output = displayAllTenses({ verb, tense, mode });
    }
  } catch (error) {
    if (error instanceof Error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
      return [];
    } else {
      return [];
    }
  }

  return output.filter((record: any) => record !== "");
}

export default function Command(props: LaunchProps<{ arguments: ConjugationArguments }>) {
  const [searchText, setSearchText] = useState("");
  const table = generateTenseTable(props.arguments);
  const [filteredList, filterList] = useState(table);

  return (
    <List
      onSearchTextChange={setSearchText}
      navigationTitle="Search Conjugations"
      searchBarPlaceholder="Search Conjugations"
    >
      {table.length > 0 ? (
        filteredList.map((item: any) => (
          <List.Section key={Math.random()} title={"Tense"} subtitle={item["mode"] + "," + item["tense"]}>
            {item["body"].map((verbTense: any) => (
              <List.Item
                key={Math.random()}
                title={verbTense["pronoun"]}
                subtitle={verbTense["verb"]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard content={verbTense["pronoun"] + " " + verbTense["verb"]} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      ) : (
        <List.EmptyView
          icon={{ source: "https://placekitten.com/500/500" }}
          title="We can't find what you're looking for :("
        />
      )}
    </List>
  );
}

function displayAllTenses({ verb, mode, tense }: ConjugationArguments) {
  const output = [];
  for (const [mode, tenses] of Object.entries(structure)) {
    for (const tense of tenses) {
      output.push(generateTenseConjugationDict({ verb, mode, tense }));
    }
  }
  return output;
}

function generateTenseConjugationDict({ verb, mode, tense }: ConjugationArguments) {
  const body = conjugationFR.conjugate(verb, mode ?? "", tense ?? "").filter((record) => record.pronounIndex !== -1);
  if (body.length === 0) {
    return "";
  }
  return {
    mode: mode,
    tense: tense,
    body,
  };
}
