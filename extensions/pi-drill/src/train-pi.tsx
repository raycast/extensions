import { useState, useMemo, useCallback, useEffect } from "react";
import { Form, showToast, Toast, ActionPanel, Action, environment } from "@raycast/api";
import { readFile } from "fs/promises";
import { join } from "path";

// Fallback to first 100 digits of pi if file fails to load
const FALLBACK_PI_DIGITS =
  "1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679".split("");
const MILESTONE_INTERVAL = 10; // Show toast every N correct digits

export default function PiTrain() {
  const [piDigits, setPiDigits] = useState<string[]>(FALLBACK_PI_DIGITS);
  const [input, setInput] = useState("");
  const [piIndex, setPiIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [hints, setHints] = useState(0);
  const [hintedIndexes, setHintedIndexes] = useState<Set<number>>(new Set());

  // Load PI digits from assets directory on mount
  useEffect(() => {
    async function loadPiDigits() {
      try {
        const assetsPath = environment.assetsPath;
        const filePath = join(assetsPath, "pi-raw.txt");
        const content = await readFile(filePath, "utf-8");
        const digits = content.trim().split("");
        if (digits.length > 0) {
          setPiDigits(digits);
        }
      } catch {
        // File doesn't exist in assets directory, use fallback
        // Fallback is already set as initial state
      }
    }
    loadPiDigits();
  }, []);

  // Memoize expensive string operations
  const digitsSoFar = useMemo(() => piDigits.slice(0, piIndex).join(""), [piIndex, piDigits]);
  const progressPercent = useMemo(() => Math.round((piIndex / piDigits.length) * 100), [piIndex, piDigits.length]);
  const hasHintedCurrentDigit = useMemo(() => hintedIndexes.has(piIndex), [hintedIndexes, piIndex]);

  const handleChange = useCallback(
    (value: string) => {
      if (finished) return;

      // Only allow single digit input (0-9), filter out non-digits
      const digitOnly = value.replace(/[^0-9]/g, "");

      // If multiple digits or non-digit characters, only keep the first digit
      const singleDigit = digitOnly.slice(0, 1);
      setInput(singleDigit);

      if (singleDigit.length === 1) {
        const nextDigit = piDigits[piIndex] ?? "";

        if (singleDigit === nextDigit) {
          const nextIndex = piIndex + 1;
          setPiIndex(nextIndex);
          setHistory((prev) => [...prev, singleDigit]);
          setInput("");
          setHintedIndexes(new Set()); // Clear for next digit

          if (nextIndex === piDigits.length) {
            setFinished(true);
            showToast({
              style: Toast.Style.Success,
              title: "Congratulations! 🎉",
              message: `You've completed all ${piDigits.length} digits!`,
            });
          } else if (nextIndex % MILESTONE_INTERVAL === 0) {
            // Only show toast on milestones to reduce noise
            showToast({
              style: Toast.Style.Success,
              title: "Milestone reached!",
              message: `${nextIndex} digits correct!`,
            });
          }
        } else {
          // Update mistakes, reset streak (but keep progress), and show toast
          setMistakes((count) => {
            const newCount = count + 1;
            showToast({
              style: Toast.Style.Failure,
              title: "Incorrect!",
              message: `Mistakes made: ${newCount}`,
            });
            return newCount;
          });
          setHistory([]);
          setInput("");
        }
      }
    },
    [finished, piIndex, piDigits],
  );

  const handleShowHint = useCallback(() => {
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
    const nextDigit = piDigits[currIndex] ?? "";
    showToast({
      style: Toast.Style.Success,
      title: "Hint",
      message: `The next digit is: ${nextDigit}`,
    });
  }, [finished, piIndex, piDigits, hintedIndexes]);

  const handleReset = useCallback(() => {
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
  }, []);

  return (
    <Form
      navigationTitle="Pi Trainer"
      actions={
        <ActionPanel>
          {!finished && (
            <Action
              title={hasHintedCurrentDigit ? "Show Hint (Already Used)" : "Show Hint"}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
              onAction={handleShowHint}
            />
          )}
          <Action title="Reset" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={handleReset} />
        </ActionPanel>
      }
    >
      <Form.Description title="Digits so far" text={`3.${digitsSoFar}`} />
      <Form.Description title="Progress" text={`${piIndex} / ${piDigits.length} (${progressPercent}%)`} />
      <Form.TextField
        id="digit"
        title="Next Digit"
        placeholder={finished ? "You finished! 🎉" : "Type the next digit of π"}
        value={input}
        onChange={handleChange}
        autoFocus
      />
      <Form.Description title="Current Streak" text={history.length.toString()} />
      <Form.Description title="Mistakes" text={mistakes.toString()} />
      <Form.Description title="Hints used" text={hints.toString()} />
      {finished && <Form.Description title="Well Done!" text={`You recalled all ${piDigits.length} digits of π!`} />}
    </Form>
  );
}