import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { deliverSecret, randomIndex } from "./generator";
import { PASSPHRASE_WORDS } from "./passphrase-words";

interface PassphraseValues {
  wordCount: string;
  separator: string;
  capitalize: boolean;
}

const separators: Record<string, string> = { hyphen: "-", space: " ", dot: ".", none: "" };

export default function GeneratePassphrase() {
  const [wordCount, setWordCount] = useState("6");
  const entropy = Number.parseInt(wordCount, 10) * Math.log2(PASSPHRASE_WORDS.length);

  async function submit(values: PassphraseValues) {
    const count = Number.parseInt(values.wordCount, 10);
    const phrase = Array.from(
      { length: count },
      () => PASSPHRASE_WORDS[randomIndex(PASSPHRASE_WORDS.length)],
    )
      .map((word) => (values.capitalize ? `${word[0].toUpperCase()}${word.slice(1)}` : word))
      .join(separators[values.separator]);
    await deliverSecret(phrase, `${count}-word passphrase`);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Passphrase" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`${Number.isInteger(entropy) ? Math.floor(entropy) : 0} bits of random entropy. Use 8 words for about 64 bits.`}
      />
      <Form.Dropdown id="wordCount" title="Words" value={wordCount} onChange={setWordCount}>
        {[4, 5, 6, 7, 8].map((count) => (
          <Form.Dropdown.Item key={count} value={String(count)} title={`${count} words`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="separator" title="Separator" defaultValue="hyphen">
        <Form.Dropdown.Item value="hyphen" title="Hyphen" />
        <Form.Dropdown.Item value="space" title="Space" />
        <Form.Dropdown.Item value="dot" title="Dot" />
        <Form.Dropdown.Item value="none" title="None" />
      </Form.Dropdown>
      <Form.Checkbox id="capitalize" label="Capitalize each word" defaultValue />
    </Form>
  );
}
