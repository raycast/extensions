import { Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import { getErrorMessage } from "../lib/errors";
import { formatJsonInput, type FormatResult } from "../lib/format-json";
import { requireNonEmptyText } from "../lib/input";
import { ErrorDetail } from "./error-detail";
import { FormatResultDetail } from "./result-detail";

type FormatSourceCommandProps = {
  inputPromise: Promise<string | null | undefined>;
  sourceName: string;
};

type State =
  | { status: "loading" }
  | { message: string; status: "error" }
  | { result: FormatResult; status: "ready" };

export function FormatSourceCommand({
  inputPromise,
  sourceName,
}: FormatSourceCommandProps) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const input = requireNonEmptyText(await inputPromise, sourceName);
        const result = formatJsonInput(input);
        if (!cancelled) {
          setState({ result, status: "ready" });
        }
      } catch (error) {
        const message = getErrorMessage(error);
        if (!cancelled) {
          setState({ message, status: "error" });
          await showToast({
            style: Toast.Style.Failure,
            title: `Unable to read ${sourceName.toLowerCase()}`,
            message,
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [inputPromise, sourceName]);

  if (state.status === "loading") {
    return <Detail isLoading />;
  }

  if (state.status === "error") {
    return <ErrorDetail message={state.message} />;
  }

  return <FormatResultDetail result={state.result} />;
}
