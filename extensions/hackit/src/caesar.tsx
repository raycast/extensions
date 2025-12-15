import { ActionPanel, Action, Form, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { caesarCipher, AlphabetType } from "./utils/caesar";

export default function Command() {
  const [text, setText] = useState("");
  const [shift, setShift] = useState("1");
  const [alphabetType, setAlphabetType] = useState<string>(AlphabetType.English);
  const [customAlphabet, setCustomAlphabet] = useState("");
  const [resultForward, setResultForward] = useState("");
  const [resultBackward, setResultBackward] = useState("");

  useEffect(() => {
    Clipboard.readText().then((clip) => {
      if (clip) {
        setText(clip);
      }
    });
  }, []);

  useEffect(() => {
    const shiftNum = parseInt(shift, 10);
    if (!isNaN(shiftNum) && text) {
      setResultForward(caesarCipher(text, shiftNum, alphabetType as AlphabetType, customAlphabet));
      setResultBackward(caesarCipher(text, -shiftNum, alphabetType as AlphabetType, customAlphabet));
    } else {
      setResultForward("");
      setResultBackward("");
    }
  }, [text, shift, alphabetType, customAlphabet]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Forward Result" content={resultForward} />
          <Action.CopyToClipboard title="Copy Backward Result" content={resultBackward} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Input Text" placeholder="Enter text..." value={text} onChange={setText} />
      <Form.TextField
        id="shift"
        title="Shift Amount"
        placeholder="e.g. 1"
        value={shift}
        onChange={setShift}
        autoFocus={true}
      />
      <Form.Dropdown id="alphabet" title="Alphabet" value={alphabetType} onChange={setAlphabetType}>
        <Form.Dropdown.Item value={AlphabetType.English} title="English (A-Z)" />
        <Form.Dropdown.Item value={AlphabetType.EnglishDigits} title="English + Digits (A-Z0-9)" />
        <Form.Dropdown.Item value={AlphabetType.Latin} title="Latin (No J, U, W)" />
        <Form.Dropdown.Item value={AlphabetType.ASCII} title="ASCII Table (0-127)" />
        <Form.Dropdown.Item value={AlphabetType.Custom} title="Custom Alphabet" />
      </Form.Dropdown>
      {alphabetType === AlphabetType.Custom && (
        <Form.TextField
          id="custom"
          title="Custom Alphabet"
          placeholder="e.g. ABC..."
          value={customAlphabet}
          onChange={setCustomAlphabet}
        />
      )}
      <Form.Description title={`Forward (+${shift})`} text={resultForward || ""} />
      <Form.Description title={`Backward (-${shift})`} text={resultBackward || ""} />
    </Form>
  );
}
