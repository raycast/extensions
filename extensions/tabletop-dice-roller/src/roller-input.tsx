import { showToast, Toast, Clipboard, ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

function rollDice(numDice: number, numSides: number): number {
  let total = 0;
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(Math.random() * numSides) + 1;
  }
  return total;
}

function parseDiceRoll(input: string): { result: number; breakdown: string } {
  const diceRegex = /(\d+)d(\d+)/gi;
  let expression = input.trim();
  const rolls: Map<string, number> = new Map();

  // Find and roll all dice
  let match;
  while ((match = diceRegex.exec(input)) !== null) {
    const diceNotation = match[0].toLowerCase();
    if (!rolls.has(diceNotation)) {
      const numDice = parseInt(match[1]);
      const numSides = parseInt(match[2]);
      rolls.set(diceNotation, rollDice(numDice, numSides));
    }
    expression = expression.replace(new RegExp(diceNotation, "gi"), rolls.get(diceNotation)!.toString());
  }

  // Evaluate the expression
  try {
    const result = Function('"use strict"; return (' + expression + ")")();
    const breakdown = Array.from(rolls.entries())
      .map(([dice, value]) => `${dice} = ${value}`)
      .join(", ");
    return { result, breakdown: breakdown ? `(${breakdown})` : "" };
  } catch {
    throw new Error("Invalid dice roll expression");
  }
}

export default function Roll() {
  const [history, setHistory] = useState<Array<{ input: string; result: number; breakdown: string }>>([]);

  const handleSubmit = async (values: Record<string, string>) => {
    try {
      const input = values.name;
      const { result, breakdown } = parseDiceRoll(input);
      await Clipboard.copy(result.toString());
      setHistory([{ input, result, breakdown }, ...history]);
      await showToast({
        style: Toast.Style.Success,
        title: `Rolled: ${result}`,
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
      enableDrafts
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
      <Form.TextField id="name" title="Dice Roll" placeholder="Enter dice notation (e.g., 1d20 + 5)" />
      {history.length > 0 && (
        <>
          <Form.Separator />
          <Form.Description title="History" text={history.map((h) => `${h.input} = ${h.result}`).join("\n")} />
        </>
      )}
    </Form>
  );
}
