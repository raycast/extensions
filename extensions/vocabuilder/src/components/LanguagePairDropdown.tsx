import { useEffect, useMemo, useRef, useState } from "react";
import { List } from "@raycast/api";
import { LanguagePair } from "../lib/languages";
import {
  getRecentLanguagePairChoices,
  getSearchLanguagePairChoices,
  languagePairValue,
  LanguagePairChoice,
} from "../lib/languageSession";

interface Props {
  pair: LanguagePair;
  defaultPair: LanguagePair;
  onChange: (value: string) => void;
}

export default function LanguagePairDropdown({ pair, defaultPair, onChange }: Props) {
  const [searchText, setSearchText] = useState("");
  const [recentChoices, setRecentChoices] = useState<LanguagePairChoice[]>([]);
  const searchTextRef = useRef("");
  const recentChoicesRef = useRef<LanguagePairChoice[]>([]);
  const searchChoicesRef = useRef<LanguagePairChoice[]>([]);
  const pairValue = languagePairValue(pair);
  const defaultPairValue = languagePairValue(defaultPair);

  useEffect(() => {
    let stale = false;
    getRecentLanguagePairChoices(defaultPair, pair).then((choices) => {
      if (!stale) {
        recentChoicesRef.current = choices;
        setRecentChoices(choices);
      }
    });
    return () => {
      stale = true;
    };
  }, [defaultPairValue, pairValue]);

  const searchChoices = useMemo(
    () => getSearchLanguagePairChoices(searchText, defaultPair),
    [defaultPairValue, searchText],
  );
  useEffect(() => {
    searchChoicesRef.current = searchChoices;
  }, [searchChoices]);
  const isSearching = searchText.trim().length > 0;
  const choices = isSearching ? searchChoices : recentChoices;

  return (
    <List.Dropdown
      id="languagePair"
      tooltip="Change language pair (⌘P)"
      placeholder="Try PL-UA, English-Polish, or PL..."
      filtering={false}
      value={pairValue}
      onSearchTextChange={(value) => {
        searchTextRef.current = value;
        setSearchText(value);
      }}
      onChange={(value) => {
        const currentSearch = searchTextRef.current;
        const currentChoices = currentSearch.trim() ? searchChoicesRef.current : recentChoicesRef.current;
        if (!currentChoices.some((choice) => choice.value === value)) return;

        setSearchText("");
        searchTextRef.current = "";
        onChange(value);
      }}
    >
      <List.Dropdown.Section title={isSearching ? "Matching Pairs" : "Recent Pairs"}>
        {choices.map((choice) => (
          <LanguagePairDropdownItem key={choice.value} choice={choice} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function LanguagePairDropdownItem({ choice }: { choice: LanguagePairChoice }) {
  return <List.Dropdown.Item title={choice.title} value={choice.value} keywords={choice.keywords} />;
}
