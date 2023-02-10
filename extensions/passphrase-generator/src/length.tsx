import { useEffect, useState } from "react";
import { List } from "@raycast/api";

import type { PasswordGenerator } from "./utils/types";
import {
  AlphanumGenerator,
  AsciiGenerator,
  DictionaryGenerator,
  HexGenerator,
  NumericGenerator,
  PronounceableGenerator,
} from "./utils/generators";
import ListItem from "./ListItem";
import usePreferences from "./hooks/usePreferences";

export default function Command(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [strengthLevel, setStrengthLevel] = useState("");
  const [passwords, setPasswords] = useState<PasswordGenerator[]>([]);

  const { length: defaultPasswordLength } = usePreferences();

  const generatePasswords = (): void => {
    if (parseInt(strengthLevel) > 0 || strengthLevel === "") {
      const length = parseInt(strengthLevel, 10) || defaultPasswordLength;

      setPasswords([
        new DictionaryGenerator({ length }),
        new PronounceableGenerator({ length }),
        new AsciiGenerator({ length }),
        new AlphanumGenerator({ length }),
        new NumericGenerator({ length }),
        new HexGenerator({ length }),
      ]);
    }
  };

  useEffect(() => {
    generatePasswords();
    setLoading(false);
  }, [strengthLevel]);

  return (
    <List
      isLoading={loading}
      searchText={strengthLevel}
      onSearchTextChange={setStrengthLevel}
      searchBarPlaceholder="Generate password of given length"
    >
      {passwords.map((generator) => (
        <ListItem key={generator.id} generator={generator} generatePasswords={generatePasswords} />
      ))}
    </List>
  );
}
