import { useEffect, useState } from "react";
import { AskOutcome, CliMissingError, CliOutdatedError, runAsk } from "./cli";

export interface AskRequest {
  args: string[];
  input?: string;
}

export type AnswerState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; outcome: AskOutcome }
  | { kind: "failed"; title: string; message: string };

export function useLokalBotAnswer(
  request: AskRequest | null,
  revision: number,
): AnswerState {
  const [state, setState] = useState<AnswerState>({ kind: "idle" });
  const key = request ? JSON.stringify({ ...request, revision }) : null;

  useEffect(() => {
    if (key === null) return;
    const { args, input } = JSON.parse(key) as AskRequest;
    const controller = new AbortController();
    setState({ kind: "loading" });
    runAsk(args, { input, signal: controller.signal })
      .then((outcome) => setState({ kind: "done", outcome }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof CliMissingError) {
          setState({
            kind: "failed",
            title: "LokalBot CLI not found",
            message: error.message,
          });
        } else if (error instanceof CliOutdatedError) {
          setState({
            kind: "failed",
            title: "Update LokalBot",
            message: error.message,
          });
        } else {
          setState({
            kind: "failed",
            title: "LokalBot could not answer",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => controller.abort();
  }, [key]);

  return state;
}
