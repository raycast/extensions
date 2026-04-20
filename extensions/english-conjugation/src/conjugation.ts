import conjugate from "eng-verber";
import { Icon } from "@raycast/api";
import { getCommonCollocations } from "./collocations";

type FormId = "infinitive" | "third-person-singular" | "simple-past" | "past-participle" | "present-participle";

export type VerbForm = {
  id: FormId;
  label: string;
  value: string;
  icon: Icon;
  detail: string;
  usage: string;
  collocations: string[];
};

export function getSearchSeed(rawVerb?: string) {
  return rawVerb?.trim().toLowerCase() ?? "";
}

export function extractInfinitive(rawVerb: string) {
  return (
    rawVerb
      .trim()
      .toLowerCase()
      .replace(/^to\s+/, "")
      .split(/\s+/)[0] ?? ""
  );
}

export function getVerbForms(rawVerb: string) {
  const infinitive = extractInfinitive(rawVerb);

  if (!infinitive) {
    return [];
  }

  const verb = conjugate(infinitive);
  const commonCollocations = getCommonCollocations(verb.infinitive);
  const simplePast =
    verb.singularPast === verb.pluralPast ? verb.singularPast : `${verb.singularPast} / ${verb.pluralPast}`;
  const collocationsSection =
    commonCollocations.length > 0
      ? `\n\n### Common Collocations\n\n${commonCollocations.map((item: string) => `- ${item}`).join("\n")}`
      : "";

  return [
    {
      id: "infinitive",
      label: "Infinitive",
      value: verb.infinitive,
      icon: Icon.Book,
      detail: `## ${verb.infinitive}\n\nBase form used after **to** and with most auxiliary verbs.${collocationsSection}`,
      usage: `to ${verb.infinitive}`,
      collocations: commonCollocations,
    },
    {
      id: "third-person-singular",
      label: "Third-Person Singular",
      value: verb.singularPresent,
      icon: Icon.Person,
      detail: `## ${verb.singularPresent}\n\nSimple present form used with **he / she / it**.${collocationsSection}`,
      usage: `he / she / it ${verb.singularPresent}`,
      collocations: commonCollocations,
    },
    {
      id: "simple-past",
      label: "Simple Past",
      value: simplePast,
      icon: Icon.Clock,
      detail: `## ${simplePast}\n\nSimple past form.\n\nUse with past-time contexts such as **yesterday** or **last week**.${collocationsSection}`,
      usage:
        infinitive === "be"
          ? `I / he / she ${verb.singularPast} • you / we / they ${verb.pluralPast}`
          : `yesterday I ${verb.singularPast}`,
      collocations: commonCollocations,
    },
    {
      id: "past-participle",
      label: "Past Participle",
      value: verb.perfect,
      icon: Icon.CheckCircle,
      detail: `## ${verb.perfect}\n\nPast participle used with **have**, **has**, or **had**.${collocationsSection}`,
      usage: `have ${verb.perfect}`,
      collocations: commonCollocations,
    },
    {
      id: "present-participle",
      label: "Present Participle",
      value: verb.continuous,
      icon: Icon.Dot,
      detail: `## ${verb.continuous}\n\nPresent participle used in continuous tenses and as a verbal adjective.${collocationsSection}`,
      usage: `is ${verb.continuous}`,
      collocations: commonCollocations,
    },
  ] satisfies VerbForm[];
}

export function getAllFormsText(forms: VerbForm[]) {
  return forms.map((form) => `${form.label}: ${form.value}`).join("\n");
}

export function getCollocationsText(collocations: string[]) {
  return collocations.map((item) => `- ${item}`).join("\n");
}
