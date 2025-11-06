import { useState } from "react";
import { Form, showToast, Toast, ActionPanel, Action } from "@raycast/api";
import pi from "./pi-raw.txt?raw";

function usePiDigits() {
  return useState(() => (typeof pi === "string" ? pi.trim().split("") : ["1", "4", "1"]))[0];
}

export default function PiTrain() {
  const PI_DIGITS = usePiDigits();

  const [input, setInput] = useState("");
  const [piIndex, setPiIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [hints, setHints] = useState(0);
  const [hintedIndexes, setHintedIndexes] = useState<Set<number>>(new Set());

  function handleChange(value: string) {
    if (finished) return;
    setInput(value);

    if (value.length === 1) {
      const digit = value.trim();
      const nextDigit = PI_DIGITS[piIndex] ?? "";

      if (digit === nextDigit) {
        const nextIndex = piIndex + 1;
        setPiIndex(nextIndex);
        setHistory((prev) => [...prev, digit]);
        setInput("");
        // Clear hints for next digit
        setHintedIndexes(new Set());
        if (nextIndex === PI_DIGITS.length) {
          setFinished(true);
          showToast({
            style: Toast.Style.Success,
            title: "Congratulations! 🎉",
            message: `You've completed all ${PI_DIGITS.length} digits!`,
          });
        } else {
          showToast({
            style: Toast.Style.Success,
            title: "Correct!",
            message: "Keep going!",
          });
        }
      } else {
        setMistakes((count) => count + 1);
        setInput("");
        showToast({
          style: Toast.Style.Failure,
          title: "Incorrect!",
          message: `Mistakes made: ${mistakes + 1}`,
        });
      }
    }
  }

  function handleShowHint() {
    if (finished) return;
    const currIndex = piIndex;
    if (!hintedIndexes.has(currIndex)) {
      setHints((h) => h + 1);
      setHintedIndexes((prev) => {
        const next = new Set(prev);
        next.add(currIndex);
        return next;
      });
    }
    const nextDigit = PI_DIGITS[currIndex] ?? "";
    showToast({
      style: Toast.Style.Animated,
      title: "Hint",
      message: `The next digit is: ${nextDigit}`,
    });
  }

  function handleReset() {
    setInput("");
    setPiIndex(0);
    setHistory([]);
    setMistakes(0);
    setHints(0);
    setHintedIndexes(new Set());
    setFinished(false);
    showToast({
      style: Toast.Style.Success,
      title: "Session reset!",
      message: "You can start again.",
    });
  }

  return (
    <Form
      navigationTitle="Pi Trainer"
      actions={
        <ActionPanel>
          <Action
            title="Show Hint"
            shortcut={{ modifiers: ["cmd"], key: "h" }}
            onAction={handleShowHint}
            disabled={finished}
          />
          <Action title="Reset" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={handleReset} />
        </ActionPanel>
      }
    >
      <Form.Description title="Digits so far" text={`3.${history.join("")}`} />
      <Form.TextField
        id="digit"
        title="Next Digit"
        placeholder={finished ? "You finished! 🎉" : "Type the next digit of π"}
        value={input}
        onChange={handleChange}
        autoFocus
        disabled={finished}
      />
      <Form.Description title="Current Streak" text={history.length.toString()} />
      <Form.Description title="Mistakes" text={mistakes.toString()} />
      <Form.Description title="Hints used" text={hints.toString()} />
      {finished && <Form.Description title="Well Done!" text={`You recalled all ${PI_DIGITS.length} digits of π!`} />}
    </Form>
  );
}
