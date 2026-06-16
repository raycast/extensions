import { showToast, Toast, Clipboard, ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

const DICE_FIELD_ID = "diceRoll";

function rollDice(numDice: number, numSides: number): number {
  let total = 0;
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(Math.random() * numSides) + 1;
  }
  return total;
}

/** Evaluates arithmetic with +, -, *, /, parentheses, and integer literals only (no code execution). */
function evaluateArithmetic(expression: string): number {
  const s = expression.replace(/\s/g, "");
  if (!s) {
    throw new Error("Invalid dice roll expression");
  }
  let pos = 0;

  function peek(): string | undefined {
    return s[pos];
  }

  function parseFactor(): number {
    if (peek() === "+") {
      pos++;
      return parseFactor();
    }
    if (peek() === "-") {
      pos++;
      return -parseFactor();
    }
    if (peek() === "(") {
      pos++;
      const v = parseExpr();
      if (peek() !== ")") {
        throw new Error("Invalid dice roll expression");
      }
      pos++;
      return v;
    }
    if (!/\d/.test(peek() ?? "")) {
      throw new Error("Invalid dice roll expression");
    }
    const start = pos;
    while (/\d/.test(peek() ?? "")) {
      pos++;
    }
    return parseInt(s.slice(start, pos), 10);
  }

  function parseTerm(): number {
    let v = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const op = peek()!;
      pos++;
      const r = parseFactor();
      if (op === "/") {
        if (r === 0) {
          throw new Error("Division by zero");
        }
        v = v / r;
      } else {
        v = v * r;
      }
    }
    return v;
  }

  function parseExpr(): number {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = peek()!;
      pos++;
      const r = parseTerm();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }

  const result = parseExpr();
  if (pos !== s.length) {
    throw new Error("Invalid dice roll expression");
  }
  return result;
}

function parseDiceRoll(input: string): { result: number; breakdown: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Enter a dice expression");
  }

  const diceRegex = /(\d+)d(\d+)/gi;
  type Replacement = { start: number; end: number; value: number; label: string };
  const replacements: Replacement[] = [];
  let match;
  while ((match = diceRegex.exec(trimmed)) !== null) {
    const numDice = parseInt(match[1], 10);
    const numSides = parseInt(match[2], 10);
    if (numDice < 1 || numSides < 1 || numDice > 100 || numSides > 1000) {
      throw new Error("Use 1–100 dice with 1–1000 sides per term");
    }
    const value = rollDice(numDice, numSides);
    replacements.push({
      start: match.index,
      end: match.index + match[0].length,
      value,
      label: match[0],
    });
  }

  let expression = trimmed;
  const byDescendingStart = [...replacements].sort((a, b) => b.start - a.start);
  for (const r of byDescendingStart) {
    expression = expression.slice(0, r.start) + String(r.value) + expression.slice(r.end);
  }

  const ordered = [...replacements].sort((a, b) => a.start - b.start);
  const breakdown = ordered.map((r) => `${r.label} → ${r.value}`).join(", ");

  try {
    const result = evaluateArithmetic(expression);
    return { result, breakdown };
  } catch {
    throw new Error("Invalid dice roll expression");
  }
}

export default function Roll() {
  const [history, setHistory] = useState<Array<{ input: string; result: number; breakdown: string }>>([]);

  const handleSubmit = async (values: Record<string, string>) => {
    try {
      const raw = values[DICE_FIELD_ID] ?? "";
      if (!raw.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Empty input",
          message: "Enter a dice expression (e.g. 2d6 + 1)",
        });
        return;
      }
      const input = raw.trim();
      const { result, breakdown } = parseDiceRoll(input);
      await Clipboard.copy(result.toString());
      setHistory([{ input, result, breakdown }, ...history]);
      await showToast({
        style: Toast.Style.Success,
        title: `Rolled: ${result}`,
        message: breakdown || undefined,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid input",
        message: error instanceof Error ? error.message : "Please enter a valid dice roll",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Roll" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Supported Expressions"
        text="Use dice notation (e.g., 1d20) with +, -, *, / operators. Example: 2d6 + 3d4 - 1"
      />
      <Form.TextField id={DICE_FIELD_ID} title="Dice Roll" placeholder="Enter dice notation (e.g., 1d20 + 5)" />
      {history.length > 0 && (
        <>
          <Form.Separator />
          <Form.Description
            title="History"
            text={history
              .map((h) => (h.breakdown ? `${h.input} = ${h.result} (${h.breakdown})` : `${h.input} = ${h.result}`))
              .join("\n")}
          />
        </>
      )}
    </Form>
  );
}
