import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import {
  deliverSecret,
  DIGIT_CHARACTERS,
  LOWERCASE_CHARACTERS,
  randomPassword,
  SYMBOL_CHARACTERS,
  UPPERCASE_CHARACTERS,
} from "./generator";

interface PasswordFormValues {
  length: string;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
  easyToRead: boolean;
}

const EASY_TO_READ_GROUPS = [UPPERCASE_CHARACTERS, LOWERCASE_CHARACTERS, DIGIT_CHARACTERS, SYMBOL_CHARACTERS];
const STANDARD_GROUPS = ["ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz", "0123456789", SYMBOL_CHARACTERS];

function characterGroups(excludeHardToReadCharacters: boolean): string[] {
  return excludeHardToReadCharacters ? EASY_TO_READ_GROUPS : STANDARD_GROUPS;
}

function parseLength(value: string): number {
  return /^\d+$/.test(value) ? Number(value) : Number.NaN;
}

function entropy(length: number, selectedGroups: string[]): string {
  const alphabetSize = selectedGroups.reduce((total, group) => total + group.length, 0);
  return alphabetSize > 0
    ? `${Math.floor(length * Math.log2(alphabetSize))} bits of random entropy`
    : "Choose a character group";
}

export default function GeneratePassword() {
  const [length, setLength] = useState("20");
  const [groups, setGroups] = useState([true, true, true, true]);
  const [easyToRead, setEasyToRead] = useState(true);
  const selectedGroups = characterGroups(easyToRead).filter((_, index) => groups[index]);
  const parsedLength = parseLength(length);

  async function submit(values: PasswordFormValues) {
    const selected = characterGroups(values.easyToRead).filter(
      (_, index) => [values.uppercase, values.lowercase, values.digits, values.symbols][index],
    );
    const requestedLength = parseLength(values.length);

    if (!Number.isInteger(requestedLength) || requestedLength < 4 || requestedLength > 256) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Use a whole-number length from 4 to 256",
      });
      return;
    }
    if (selected.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Choose at least one character group" });
      return;
    }
    if (requestedLength < selected.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Use at least ${selected.length} characters for the selected groups`,
      });
      return;
    }

    await deliverSecret(randomPassword(requestedLength, selected), `${requestedLength}-character password`);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Password" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`${entropy(Number.isInteger(parsedLength) ? parsedLength : 0, selectedGroups)}. Every selected group is guaranteed to appear.`}
      />
      <Form.TextField id="length" title="Length" placeholder="4–256" value={length} onChange={setLength} />
      <Form.Separator />
      <Form.Checkbox
        id="uppercase"
        label="Uppercase letters"
        value={groups[0]}
        onChange={(value) => setGroups([value, groups[1], groups[2], groups[3]])}
      />
      <Form.Checkbox
        id="lowercase"
        label="Lowercase letters"
        value={groups[1]}
        onChange={(value) => setGroups([groups[0], value, groups[2], groups[3]])}
      />
      <Form.Checkbox
        id="digits"
        label="Digits"
        value={groups[2]}
        onChange={(value) => setGroups([groups[0], groups[1], value, groups[3]])}
      />
      <Form.Checkbox
        id="symbols"
        label="Symbols (! @ # $ % ^ & * - _)"
        value={groups[3]}
        onChange={(value) => setGroups([groups[0], groups[1], groups[2], value])}
      />
      <Form.Checkbox
        id="easyToRead"
        label="Exclude hard-to-read characters: O, 0, I, l, and 1"
        value={easyToRead}
        onChange={setEasyToRead}
      />
    </Form>
  );
}
