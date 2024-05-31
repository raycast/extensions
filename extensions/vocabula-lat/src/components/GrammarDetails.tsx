import { List } from "@raycast/api";
import React from "react";
import { Grammar, LexicalData } from "../types";

import Translations from "../../assets/texts.json";

interface GrammarMeta {
  grammar: Grammar;
  last?: boolean;
}

const GrammarDetails = ({ grammar, last = false }: GrammarMeta): JSX.Element => {
  const translations: LexicalData = Translations;

  return (
    <>
      {grammar?.part_of_speech && (
        <>
          <List.Item.Detail.Metadata.Label title="Part of speech" text={translations.pos[grammar.part_of_speech]} />
        </>
      )}
      {grammar?.conjugation && (
        <>
          <List.Item.Detail.Metadata.Label
            title="Conjugation"
            text={translations.conjugation[grammar.conjugation.join("_")]}
          />
        </>
      )}
      {grammar?.declension && (grammar.part_of_speech === "N" || grammar.part_of_speech === "ADJ") && (
        <>
          <List.Item.Detail.Metadata.Label
            title="Declension"
            text={translations.declension[grammar.part_of_speech][grammar.declension[0]]}
          />
        </>
      )}
      {grammar?.case && (
        <>
          <List.Item.Detail.Metadata.Label title="Case" text={translations.case[grammar.case]} />
        </>
      )}
      {grammar?.number && (
        <>
          <List.Item.Detail.Metadata.Label title="Number" text={translations.number[grammar.number]} />
        </>
      )}
      {grammar?.gender && (
        <>
          <List.Item.Detail.Metadata.Label title="Gender" text={translations.gender[grammar.gender]} />
        </>
      )}
      {grammar?.comparison_type && (
        <>
          <List.Item.Detail.Metadata.Label
            title="Comparison type"
            text={translations.comparison_type[grammar.comparison_type]}
          />
        </>
      )}
      {grammar?.tense && (
        <>
          <List.Item.Detail.Metadata.Label title="Tense" text={translations.tense[grammar.tense]} />
        </>
      )}
      {grammar?.voice && (
        <>
          <List.Item.Detail.Metadata.Label title="Voice" text={translations.voice[grammar.voice]} />
        </>
      )}
      {grammar?.mood && (
        <>
          <List.Item.Detail.Metadata.Label title="Mood" text={translations.mood[grammar.mood]} />
        </>
      )}
      {!last && <List.Item.Detail.Metadata.Separator />}
    </>
  );
};

export default GrammarDetails;
