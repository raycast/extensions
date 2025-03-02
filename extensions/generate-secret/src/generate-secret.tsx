import { List, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { SecretGenerator } from "./components/SecretGenerator";
import { SECRET_LENGTHS, generateSecret, type SecretLength } from "./utils/crypto";
import { copySecretToClipboard } from "./utils/clipboard";

export default function Command() {
  const preferences = getPreferenceValues<{ length: string }>();
  const [currentLength, setCurrentLength] = useState<SecretLength>(parseInt(preferences.length) as SecretLength);
  const [secret, setSecret] = useState<string>(generateSecret(currentLength));

  const handleGenerate = async (length: SecretLength) => {
    const newSecret = generateSecret(length);
    setSecret(newSecret);
    setCurrentLength(length);
    await copySecretToClipboard(newSecret);
  };

  return (
    <List navigationTitle="Generate Secret" searchBarPlaceholder="Select length to generate a secret">
      {SECRET_LENGTHS.map((length) => (
        <SecretGenerator
          key={length}
          length={length}
          isSelected={length === currentLength}
          currentSecret={length === currentLength ? secret : undefined}
          onGenerate={handleGenerate}
        />
      ))}
    </List>
  );
}
