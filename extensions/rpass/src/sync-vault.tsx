import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { configureRpassClientFromPreferences } from "./rpass/application/configure-rpass-client";
import {
  gitCommand,
  RpassError,
  type GitResult,
} from "./rpass/application/rpass-client";
import { resolveStorePath } from "./vault/application/store-path";
import checkInstall from "./vault/presentation/check-install";
import SetupPasswordStore, {
  type PasswordStoreSetupReason,
} from "./vault/presentation/setup-password-store";

interface CommitItem {
  hash: string;
  shortHash: string;
  refs: string;
  subject: string;
  relativeDate: string;
  pushed: boolean;
}

function formatError(error: unknown): string {
  if (error instanceof RpassError) {
    return [error.message, error.details].filter(Boolean).join("\n\n");
  }
  return error instanceof Error ? error.message : String(error);
}

function formatCommandOutput(result: GitResult): string {
  return [result.stdout.trimEnd(), result.stderr.trimEnd()]
    .filter(Boolean)
    .join("\n\n");
}

function parseStatusBranch(status: string): string | undefined {
  const firstLine = status.split("\n")[0]?.trim();
  return firstLine?.startsWith("## ") ? firstLine.slice(3) : undefined;
}

function parseLog(output: string, unpushedHashes: Set<string>): CommitItem[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash, shortHash, refs, subject, relativeDate] = line.split("\x1f");
      return {
        hash,
        shortHash,
        refs,
        subject,
        relativeDate,
        pushed: !unpushedHashes.has(hash),
      };
    })
    .filter((commit) => commit.hash && commit.shortHash && commit.subject);
}

function getPrimaryRef(refs: string): string | undefined {
  return refs
    .split(",")
    .map((ref) => ref.trim())
    .find((ref) => ref && !ref.startsWith("HEAD"));
}

function getSetupReason(error: unknown): PasswordStoreSetupReason | undefined {
  if (!(error instanceof RpassError)) return undefined;
  if (error.code === "store_not_found") return "store_missing";
  if (error.code === "gpg_id_not_found") return "gpg_id_missing";
  return undefined;
}

function getRepositoryNotFound(error: unknown): boolean {
  return (
    error instanceof RpassError && error.code === "git_repository_not_found"
  );
}

function getEmptyRepositoryLogError(error: unknown): boolean {
  return (
    error instanceof RpassError &&
    error.code === "git_failed" &&
    error.message.includes("does not have any commits yet")
  );
}

export default function Command() {
  configureRpassClientFromPreferences();
  const storepath = resolveStorePath();
  const [isLoading, setIsLoading] = useState(false);
  const [isRepository, setIsRepository] = useState<boolean | undefined>();
  const [status, setStatus] = useState("");
  const [branch, setBranch] = useState<string>();
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [setupReason, setSetupReason] = useState<PasswordStoreSetupReason>();
  const [lastOutput, setLastOutput] = useState<string>();
  const [lastError, setLastError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setLastError(undefined);
    setSetupReason(undefined);
    try {
      const statusResult = await gitCommand(["status", "-sb"], storepath);
      const statusText = statusResult.stdout || statusResult.stderr;
      setStatus(statusText);
      setBranch(parseStatusBranch(statusText));
      setIsRepository(true);

      let unpushedHashes = new Set<string>();
      try {
        const upstream = await gitCommand(
          ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
          storepath,
        );
        const upstreamName = upstream.stdout.trim();
        if (upstreamName) {
          const unpushed = await gitCommand(
            ["log", `${upstreamName}..HEAD`, "--pretty=format:%H"],
            storepath,
          );
          unpushedHashes = new Set(
            unpushed.stdout.split("\n").map((line) => line.trim()),
          );
        }
      } catch {
        unpushedHashes = new Set();
      }

      try {
        const logResult = await gitCommand(
          [
            "log",
            "--pretty=format:%H%x1f%h%x1f%D%x1f%s%x1f%cr",
            "--decorate=short",
            "-50",
          ],
          storepath,
        );
        setCommits(parseLog(logResult.stdout, unpushedHashes));
      } catch (error) {
        if (getEmptyRepositoryLogError(error)) {
          setCommits([]);
        } else {
          throw error;
        }
      }
    } catch (error) {
      const reason = getSetupReason(error);
      if (reason) {
        setStatus("");
        setBranch(undefined);
        setCommits([]);
        setSetupReason(reason);
      } else if (getRepositoryNotFound(error)) {
        setStatus("");
        setBranch(undefined);
        setCommits([]);
        setIsRepository(false);
      } else {
        const message = formatError(error);
        setLastError(message);
        await showToast(Toast.Style.Failure, "Failed to Load Git Log", message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [storepath]);

  useEffect(() => {
    checkInstall();
    refresh();
  }, [refresh]);

  async function runGitAction({
    title,
    successTitle,
    args,
    confirm,
  }: {
    title: string;
    successTitle: string;
    args: string[];
    confirm?: { title: string; message: string; actionTitle: string };
  }) {
    if (confirm) {
      const confirmed = await confirmAlert({
        title: confirm.title,
        message: confirm.message,
        primaryAction: {
          title: confirm.actionTitle,
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: { title: "Cancel" },
      });
      if (!confirmed) return;
    }

    setIsLoading(true);
    setLastError(undefined);
    setSetupReason(undefined);
    try {
      const result = await gitCommand(args, storepath);
      setLastOutput(formatCommandOutput(result));
      setIsRepository(true);
      await showToast(Toast.Style.Success, successTitle);
      await refresh();
    } catch (error) {
      const reason = getSetupReason(error);
      if (reason) {
        setSetupReason(reason);
      }
      const message = formatError(error);
      setLastError(message);
      await showToast(Toast.Style.Failure, title, message);
    } finally {
      setIsLoading(false);
    }
  }

  const actions = (
    <ActionPanel>
      <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={refresh} />
      {setupReason ? (
        <Action.Push
          icon={Icon.Hammer}
          title="Initialize Password Store"
          target={
            <SetupPasswordStore
              storepath={storepath}
              reason={setupReason}
              onDone={refresh}
              popOnDone
            />
          }
        />
      ) : null}
      {isRepository === false && !setupReason ? (
        <Action
          icon={Icon.Hammer}
          title="Initialize Git"
          onAction={() =>
            runGitAction({
              title: "Failed to Initialize Git",
              successTitle: "Git Initialized",
              args: ["init"],
            })
          }
        />
      ) : null}
      {isRepository !== false && !setupReason ? (
        <>
          <Action
            icon={Icon.Download}
            title="Pull Vault"
            shortcut={{ modifiers: ["shift"], key: "enter" }}
            onAction={() =>
              runGitAction({
                title: "Failed to Pull Vault",
                successTitle: "Vault Pulled",
                args: ["pull"],
              })
            }
          />
          <Action
            icon={Icon.Upload}
            title="Push Vault"
            onAction={() =>
              runGitAction({
                title: "Failed to Push Vault",
                successTitle: "Vault Pushed",
                args: ["push"],
                confirm: {
                  title: "Push Vault?",
                  message: "Run git push in the password store?",
                  actionTitle: "Push Vault",
                },
              })
            }
          />
        </>
      ) : null}
      {status ? (
        <Action.CopyToClipboard title="Copy Status" content={status} />
      ) : null}
      {lastOutput ? (
        <Action.CopyToClipboard title="Copy Last Output" content={lastOutput} />
      ) : null}
      {lastError ? (
        <Action.CopyToClipboard title="Copy Last Error" content={lastError} />
      ) : null}
    </ActionPanel>
  );

  if (setupReason) {
    return (
      <SetupPasswordStore
        storepath={storepath}
        reason={setupReason}
        onDone={refresh}
      />
    );
  }

  if (isRepository === false) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Sync vault...">
        <List.Item
          icon={Icon.ExclamationMark}
          title="Password store is not a Git repository"
          subtitle="Run Initialize Git to start tracking it"
          accessories={[{ text: storepath }]}
          actions={actions}
        />
      </List>
    );
  }

  if (lastError && commits.length === 0) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Sync vault...">
        <List.Item
          icon={Icon.ExclamationMark}
          title="Failed to Load Git Log"
          subtitle={lastError}
          actions={actions}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by title, branch, or commit..."
    >
      <List.Section title={branch ?? "Git Log"} subtitle={storepath}>
        {commits.length === 0 ? (
          <List.Item
            icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
            title="No commits found"
            subtitle={status || undefined}
            actions={actions}
          />
        ) : (
          commits.map((commit) => {
            const primaryRef = getPrimaryRef(commit.refs);
            return (
              <List.Item
                key={commit.hash}
                icon={{
                  source: commit.pushed ? Icon.CheckCircle : Icon.Circle,
                  tintColor: commit.pushed ? Color.Green : Color.SecondaryText,
                }}
                title={commit.subject}
                subtitle={commit.relativeDate}
                accessories={[
                  ...(primaryRef ? [{ tag: primaryRef }] : []),
                  { text: commit.shortHash },
                ]}
                actions={actions}
              />
            );
          })
        )}
      </List.Section>
    </List>
  );
}
