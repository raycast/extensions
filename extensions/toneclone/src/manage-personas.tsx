import { Action, ActionPanel, Clipboard, Detail, open, showToast, Toast, closeMainWindow } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

const PERSONAS_URL = "https://app.toneclone.ai/personas";

function ManagePersonas() {
  const [isLoading, setIsLoading] = useState(true);
  const [, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  const openPersonasPage = useCallback(async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Opening ToneClone Personas...",
        message: "Taking you to the personas management page",
      });

      await open(PERSONAS_URL);

      // Mark as closing to prevent error UI from showing
      setIsClosing(true);
      setIsLoading(false);

      // Close Raycast window immediately after opening
      await closeMainWindow();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setHasError(true);
      setErrorMessage(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open personas page",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const copyUrl = useCallback(async () => {
    await Clipboard.copy(PERSONAS_URL);
    await showToast({
      style: Toast.Style.Success,
      title: "URL copied to clipboard",
      message: "You can paste it in your browser",
    });

    // Close Raycast window after copying URL
    setTimeout(async () => {
      await closeMainWindow();
    }, 500);
  }, []);

  useEffect(() => {
    // Automatically open the personas page when the command loads
    openPersonasPage();
  }, [openPersonasPage]);

  if (isLoading) {
    return (
      <Detail
        isLoading={true}
        markdown="# Opening ToneClone Personas Page

Please wait while we open the personas management page in your browser..."
        actions={
          <ActionPanel>
            <Action title="Copy URL" onAction={copyUrl} icon="📋" shortcut={{ modifiers: ["cmd"], key: "c" }} />
          </ActionPanel>
        }
      />
    );
  }

  if (isClosing) {
    return (
      <Detail
        markdown="# ✅ Opening ToneClone Personas

The personas page is opening in your browser..."
      />
    );
  }

  // If there was an error, show error state with fallback options
  return (
    <Detail
      markdown={`# ❌ Failed to Open ToneClone Personas

Failed to open the personas page automatically. You can copy the URL and open it manually.

**Error:** ${errorMessage}

**URL:** ${PERSONAS_URL}`}
      actions={
        <ActionPanel>
          <Action
            title="Open in Browser"
            onAction={openPersonasPage}
            icon="🌐"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action title="Copy URL" onAction={copyUrl} icon="📋" shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
    />
  );
}

function Command() {
  return <ManagePersonas />;
}

export default Command;
