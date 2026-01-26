import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { SetupChecker } from "./utils/setup-checker";
import { SetupStatus } from "./types/transcription";

export default function Setup() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSetup = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await SetupChecker.checkAll();
      setStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check setup");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSetup();
  }, []);

  if (isLoading && !status) {
    return <Detail isLoading={true} markdown="# Checking Dependencies..." />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={checkSetup}
              icon={Icon.ArrowClockwise}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!status) {
    return <Detail markdown="# No status available" />;
  }

  const markdown = [
    SetupChecker.formatStatus(status),
    "",
    "---",
    "",
    ...SetupChecker.getInstallInstructions(status),
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Recheck Dependencies"
            onAction={checkSetup}
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          {!status.allReady && (
            <>
              <Action.OpenInBrowser
                title="Open Installation Guide"
                url="https://github.com/senstella/parakeet-mlx#installation"
                icon={Icon.Book}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
              />
              <Action.CopyToClipboard
                title="Copy Install Commands"
                content={getInstallCommands(status)}
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </>
          )}
        </ActionPanel>
      }
      metadata={
        status.allReady ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Status"
              text="Ready"
              icon={{ source: Icon.CheckCircle, tintColor: "green" }}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Python"
              text={status.pythonVersion || "Unknown"}
            />
            <Detail.Metadata.Label
              title="Parakeet"
              text={status.parakeetVersion || "Unknown"}
            />
            <Detail.Metadata.Label
              title="Audio Tool"
              text={getAudioToolName(status)}
            />
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}

function getAudioToolName(status: SetupStatus): string {
  if (status.soxInstalled) return "SoX";
  if (status.ffmpegInstalled) return "FFmpeg";
  return "None";
}

function getInstallCommands(status: SetupStatus): string {
  const commands: string[] = [];

  if (!status.pythonVersion) {
    commands.push("brew install python3");
  }

  if (!status.parakeetInstalled) {
    commands.push("pip install parakeet-mlx");
  }

  if (!status.soxInstalled && !status.ffmpegInstalled) {
    commands.push("brew install sox  # or: brew install ffmpeg");
  }

  return commands.join("\n");
}
