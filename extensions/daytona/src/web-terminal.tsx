import { Action, ActionPanel, Clipboard, Form, Toast, getPreferenceValues, open, showToast } from "@raycast/api";
import { Daytona, DaytonaError, Sandbox } from "@daytona/sdk";
import { useCallback, useEffect, useMemo, useState } from "react";

type Preferences = {
  apiKey: string;
  apiUrl?: string;
  target?: string;
};

type FormValues = {
  sandboxId: string;
  expiresInSeconds?: string;
  autoStart?: boolean;
};

const WEB_TERMINAL_PORT = 22222;

export default function WebTerminalCommand() {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
  const [isLoadingSandboxes, setIsLoadingSandboxes] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const preferences = getPreferenceValues<Preferences>();
  const target = preferences.target && preferences.target !== "auto" ? preferences.target : undefined;
  const apiUrl = preferences.apiUrl?.trim() || undefined;

  const daytona = useMemo(
    () =>
      new Daytona({
        apiKey: preferences.apiKey,
        apiUrl,
        target,
      }),
    [preferences.apiKey, apiUrl, target],
  );

  const loadSandboxes = useCallback(async () => {
    setIsLoadingSandboxes(true);
    setLoadingError(null);

    try {
      const response = await daytona.list(undefined, 1, 100);
      setSandboxes(response.items);
    } catch (error) {
      const message = error instanceof DaytonaError || error instanceof Error ? error.message : String(error);
      setLoadingError(message);
      setSandboxes([]);
    } finally {
      setIsLoadingSandboxes(false);
    }
  }, [daytona]);

  useEffect(() => {
    loadSandboxes();
  }, [loadSandboxes]);

  function parseExpiresInSeconds(rawValue: string | undefined): number {
    const trimmed = rawValue?.trim();
    if (!trimmed) return 3600;

    const value = Number(trimmed);
    if (!Number.isInteger(value) || value < 1 || value > 86400) {
      throw new Error("Expiration must be an integer between 1 and 86400 seconds");
    }

    return value;
  }

  async function handleSubmit(values: FormValues) {
    if (sandboxes.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No sandboxes available",
        message: "Create a sandbox first, then try again.",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening web terminal",
    });

    try {
      const sandbox = await daytona.get(values.sandboxId);
      await sandbox.refreshData();

      if (values.autoStart && sandbox.state !== "started") {
        toast.title = "Starting sandbox";
        await sandbox.start();
      }

      const signedPreview = await sandbox.getSignedPreviewUrl(
        WEB_TERMINAL_PORT,
        parseExpiresInSeconds(values.expiresInSeconds),
      );
      await open(signedPreview.url);

      toast.style = Toast.Style.Success;
      toast.title = "Web terminal opened";
      toast.message = `${sandbox.name} on port ${WEB_TERMINAL_PORT}`;
      toast.primaryAction = {
        title: "Copy URL",
        onAction: () => Clipboard.copy(signedPreview.url),
      };
    } catch (error) {
      const message = error instanceof DaytonaError || error instanceof Error ? error.message : String(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to open web terminal";
      toast.message = message;
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open Web Terminal" onSubmit={handleSubmit} />
          <Action title="Refresh Sandboxes" onAction={loadSandboxes} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="sandboxId"
        title="Sandbox"
        isLoading={isLoadingSandboxes}
        placeholder={isLoadingSandboxes ? "Loading sandboxes..." : "Select a sandbox"}
      >
        {sandboxes.map((sandbox) => (
          <Form.Dropdown.Item
            key={sandbox.id}
            value={sandbox.id}
            title={sandbox.name || sandbox.id}
            icon={sandbox.state === "started" ? "🟢" : "⚪"}
          />
        ))}
      </Form.Dropdown>

      {loadingError ? (
        <Form.Description
          title="Sandbox Loading Error"
          text={`Could not load sandboxes: ${loadingError}. Use Refresh Sandboxes and try again.`}
        />
      ) : null}

      <Form.Checkbox
        id="autoStart"
        title="Auto Start Sandbox"
        label="Start sandbox automatically if it is stopped"
        defaultValue={true}
      />
      <Form.TextField
        id="expiresInSeconds"
        title="Signed URL Expiration (Seconds)"
        defaultValue="3600"
        placeholder="1-86400 (default 3600)"
      />
      <Form.Description
        title="Info"
        text="Daytona web terminal uses preview port 22222 and is opened with a signed URL for browser access."
      />
    </Form>
  );
}
