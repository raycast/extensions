import { showToast, Toast, LaunchProps, List, ActionPanel, Action } from "@raycast/api";
import conjugationFR, { Conjugation } from "conjugation-fr";

interface ConjugationArguments {
  verb: string;
}

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

type FilteredConjugations = {
  mode: string;
  tense: string;
  body: conjugationFR.Conjugation[];
};

type ConjugationEntry = FilteredConjugations | null;

function generateTenseTable(args: ConjugationArguments): FilteredConjugations[] {
  let output: ConjugationEntry[] = [];
  const { verb } = args;
  try {
    output = displayAllTenses({ verb });
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
  output = output.filter((record: ConjugationEntry) => record !== null);
  return output as FilteredConjugations[];
}

export default function Command(props: LaunchProps<{ arguments: ConjugationArguments }>) {
  const table = generateTenseTable(props.arguments);
  return (
    <List filtering={true} navigationTitle="Search Conjugations" searchBarPlaceholder="Search Conjugations">
      {table.length > 0 ? (
        table.map((item: FilteredConjugations) => (
          <List.Section key={Math.random()} title={"Tense"} subtitle={item["mode"] + "," + item["tense"]}>
            {item["body"].map((verbTense: Conjugation) => (
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
          icon={{ source: "french-conjugation-128.png" }}
          title="We can't find what you're looking for :("
        />
      )}
    </List>
  );
}

function displayAllTenses({ verb }: ConjugationArguments): ConjugationEntry[] {
  const output = [];
  for (const [mode, tenses] of Object.entries(structure)) {
    for (const tense of tenses) {
      output.push(generateTenseConjugationDict({ verb, mode, tense }));
    }
  }
  return output;
}

function generateTenseConjugationDict({ verb, mode, tense }: any): ConjugationEntry {
  const body = conjugationFR.conjugate(verb, mode ?? "", tense ?? "").filter((record) => record.pronounIndex !== -1);
  return body.length >= 0
    ? {
        mode: mode || "",
        tense: tense || "",
        body,
      }
    : null;
}
