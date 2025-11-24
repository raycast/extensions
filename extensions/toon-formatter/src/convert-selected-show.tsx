import { useCallback, useEffect, useState } from "react";
import { Action, ActionPanel, Detail, Icon, getSelectedText, showToast, Toast } from "@raycast/api";
import { encode } from "@toon-format/toon";

type State = { status: "loading" } | { status: "success"; toon: string } | { status: "error"; message: string };

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

export default function Command() {
  const [state, setState] = useState<State>({ status: "loading" });

  const convertSelection = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const selection = await getSelectedText();
      if (!selection) {
        throw new Error("No selection detected");
      }

      const json = JSON.parse(selection);
      const toon = encode(json);
      setState({ status: "success", toon });
    } catch (error) {
      const message = getErrorMessage(error);
      setState({ status: "error", message });
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversion failed",
        message,
      });
    }
  }, []);

  useEffect(() => {
    void convertSelection();
  }, [convertSelection]);

  if (state.status === "loading") {
    return <Detail isLoading markdown="Preparing TOON preview..." />;
  }

  if (state.status === "error") {
    return (
      <Detail
        markdown={`### Could not convert\n\n${state.message}`}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => setState({ status: "loading" })} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      markdown={`### TOON preview\n\n${state.toon.trim() ? `\`\`\`toon\n${state.toon}\n\`\`\`` : "(Empty output)"}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Result" content={state.toon} icon={Icon.Clipboard} />
            <Action title="Re-Run on Selection" icon={Icon.RotateClockwise} onAction={() => void convertSelection()} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
