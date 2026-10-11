import React, { useState, useEffect, useCallback } from "react";
import crypto from "crypto";
import { Form, ActionPanel, Action, Clipboard, showToast, Toast } from "@raycast/api";

export default function Command() {
  const [password, setPassword] = useState("");

  const [length, setLength] = useState("15");
  const [lengthError, setLengthError] = useState<string | undefined>();
  const [combinationError, setCombinationError] = useState<string | undefined>();

  const [useUppercase, setUseUppercase] = useState(true);
  const [useLowercase, setUseLowercase] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);

  const [minNumbers, setMinNumbers] = useState("2");
  const [minSymbols, setMinSymbols] = useState("9");

  const handleLengthChange = (newValue: string) => {
    setLength(newValue);
    const num = parseInt(newValue, 10);
    if (isNaN(num) || num < 13 || num > 128) {
      setLengthError("Value must be between 13 and 128.");
    } else {
      setLengthError(undefined);
    }
  };

  const generate = useCallback(() => {
    let len = parseInt(length) || 15;
    // Clamp to the UI constraints
    if (len < 13) len = 13;
    if (len > 128) len = 128;

    const numCnt = Math.max(0, parseInt(minNumbers) || 0);
    const symCnt = Math.max(0, parseInt(minSymbols) || 0);

    const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
    const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numberChars = "0123456789";
    const symbolChars = "!@#$%^&*()_+~`|}{[]:;?><,./-=";

    let availableChars = "";
    const reqChars: string[] = [];

    if (useLowercase) {
      availableChars += lowercaseChars;
      reqChars.push(lowercaseChars[crypto.randomInt(lowercaseChars.length)]);
    }

    if (useUppercase) {
      availableChars += uppercaseChars;
      reqChars.push(uppercaseChars[crypto.randomInt(uppercaseChars.length)]);
    }

    if (useNumbers) {
      availableChars += numberChars;
      const count = Math.max(1, numCnt);
      for (let i = 0; i < count; i++) {
        reqChars.push(numberChars[crypto.randomInt(numberChars.length)]);
      }
    }

    if (useSymbols) {
      availableChars += symbolChars;
      const count = Math.max(1, symCnt);
      for (let i = 0; i < count; i++) {
        reqChars.push(symbolChars[crypto.randomInt(symbolChars.length)]);
      }
    }

    if (availableChars.length === 0) {
      setCombinationError(undefined);
      setPassword("");
      return;
    }

    // Shuffle array using Fisher-Yates
    const shuffle = (arr: string[]) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    };

    // Follow-up fix: never silently drop requirements. If the configured
    // minimums need more slots than the requested length, refuse to generate
    // and surface an inline error instead of truncating required characters.
    if (reqChars.length > len) {
      setCombinationError(
        `Minimum requirements (${reqChars.length}) exceed the length (${len}). Lower the minimums or increase the length.`,
      );
      setPassword("");
      return;
    }
    setCombinationError(undefined);

    const remainingLength = len - reqChars.length;
    for (let i = 0; i < remainingLength; i++) {
      reqChars.push(availableChars[crypto.randomInt(availableChars.length)]);
    }

    shuffle(reqChars);

    setPassword(reqChars.join(""));
  }, [length, useLowercase, useUppercase, useNumbers, useSymbols, minNumbers, minSymbols]);

  useEffect(() => {
    generate();
  }, [generate]);

  const handleCopy = async () => {
    // Issue 2 fix: never copy an empty password as success.
    if (!password) {
      await showToast({
        title: combinationError ?? "Select at least one character set",
        style: Toast.Style.Failure,
      });
      return;
    }
    await Clipboard.copy(password);
    await showToast({ title: "Copied to clipboard", style: Toast.Style.Success });
  };

  const noCharsetSelected = !useUppercase && !useLowercase && !useNumbers && !useSymbols;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Copy Password" onAction={handleCopy} />
          <Action title="Regenerate" onAction={generate} shortcut={{ modifiers: ["cmd"], key: "r" }} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="length"
        title="Length"
        value={length}
        onChange={handleLengthChange}
        error={lengthError}
        placeholder="15"
      />

      <Form.Separator />

      <Form.Checkbox id="useUppercase" title="Include Characters" label="A-Z" value={useUppercase} onChange={setUseUppercase} />
      <Form.Checkbox id="useLowercase" title="" label="a-z" value={useLowercase} onChange={setUseLowercase} />
      <Form.Checkbox id="useNumbers" title="" label="0-9" value={useNumbers} onChange={setUseNumbers} />
      <Form.Checkbox id="useSymbols" title="" label="!@#$%^&*" value={useSymbols} onChange={setUseSymbols} />
      {noCharsetSelected && <Form.Description title="" text="Select at least one character set." />}
      {combinationError && <Form.Description title="" text={combinationError} />}

      <Form.Separator />

      {useNumbers && (
        <Form.TextField id="minNumbers" title="Minimum Numbers" value={minNumbers} onChange={setMinNumbers} />
      )}
      {useSymbols && (
        <Form.TextField id="minSymbols" title="Minimum Symbols" value={minSymbols} onChange={setMinSymbols} />
      )}
    </Form>
  );
}
