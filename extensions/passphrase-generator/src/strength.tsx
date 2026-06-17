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
import { ENTROPY_PER_LEVEL } from "./utils/constants";
import ListItem from "./ListItem";
import usePreferences from "./hooks/usePreferences";

export default function Command(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [strengthLevel, setStrengthLevel] = useState("");
  const [passwords, setPasswords] = useState<PasswordGenerator[]>([]);

  const { strength: defaultPasswordStrength } = usePreferences();

  const generatePasswords = (): void => {
    if (parseInt(strengthLevel) > 0 || strengthLevel === "") {
      const strength = (parseInt(strengthLevel, 10) || defaultPasswordStrength) * ENTROPY_PER_LEVEL;

      setPasswords([
        new DictionaryGenerator({ strength }),
        new PronounceableGenerator({ strength }),
        new AsciiGenerator({ strength }),
        new AlphanumGenerator({ strength }),
        new NumericGenerator({ strength }),
        new HexGenerator({ strength }),
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
      navigationTitle="Generate password of given strength"
      searchBarPlaceholder="Generate password of given strength"
    >
      {passwords.map((generator) => (
        <ListItem key={generator.id} generator={generator} generatePasswords={generatePasswords} />
      ))}
    </List>
  );
}
