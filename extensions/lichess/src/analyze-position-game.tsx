import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";

import { parseChessInput } from "./lib/chess";
import { analysisUrlForFen, analysisUrlForPgnMoves } from "./lib/lichessUrls";

interface AnalyzeFormValues {
  input: string;
}

export default function Command() {
  const [input, setInput] = useState("");
  const parsedInput = parseChessInput(input);
  const analysisUrl =
    parsedInput?.type === "fen"
      ? analysisUrlForFen(parsedInput.fen)
      : parsedInput?.type === "pgn"
        ? analysisUrlForPgnMoves(parsedInput.moveText, parsedInput.ply)
        : undefined;

  async function handleSubmit(values: AnalyzeFormValues) {
    const parsed = parseChessInput(values.input);

    if (!parsed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid chess input",
        message: "Paste a valid FEN or PGN.",
      });
      return false;
    }
  }

  return (
    <Form
      navigationTitle="Analyze Position / Game"
      actions={
        <ActionPanel>
          {analysisUrl ? (
            <Action.OpenInBrowser title="Open in Lichess Analysis" url={analysisUrl} />
          ) : (
            <Action.SubmitForm title="Validate Input" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="FEN or PGN"
        placeholder="Paste a FEN or PGN"
        value={input}
        onChange={setInput}
        autoFocus
      />
      <Form.Description
        title="Detected Type"
        text={parsedInput ? parsedInput.type.toUpperCase() : "Invalid or empty"}
      />
    </Form>
  );
}
