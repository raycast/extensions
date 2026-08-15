import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { type ReactNode, useEffect, useState } from "react";
import {
  OPTIMISTIC_AGENT_UNLOCK_TIMEOUT_MS,
  RpassError,
  showEntry,
} from "../../rpass/application/rpass-client";
import {
  parseVaultEntryRows,
  type VaultEntryRow,
} from "../domain/vault-entry-content";
import { copyPassword, pastePassword } from "./clipboard";
import {
  forgetStoreUnlock,
  markStoreUnlocked,
  shouldTryAgentUnlock,
} from "../infrastructure/gpg-unlock-cache";
import EditEntry from "./edit-entry";
import {
  formatGpgAwareError,
  GpgTimeoutHelp,
  isGpgTimeoutOrPinentryError,
} from "./gpg-timeout-help";
import { getOptionIcon } from "./icons";
import OtpRow from "./otp-row";

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function EntryRow({
  row,
  defaultAction,
  editTarget,
}: {
  row: VaultEntryRow;
  defaultAction: string;
  editTarget: ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  const toggleTitle = visible ? "Hide Value" : "Show Value";
  const toggleIcon = visible ? Icon.EyeSlash : Icon.Eye;

  return (
    <List.Item
      icon={getOptionIcon(row.name)}
      title={capitalizeFirstLetter(row.name)}
      accessories={visible ? [{ text: row.value }] : undefined}
      actions={
        <ActionPanel>
          {defaultAction === "copy" ? (
            <>
              <Action
                icon={Icon.Clipboard}
                title="Copy to Clipboard"
                onAction={() => copyPassword(row.value)}
              />
              <Action
                icon={Icon.TextCursor}
                title="Paste in Active App"
                onAction={() => pastePassword(row.value)}
              />
            </>
          ) : (
            <>
              <Action
                icon={Icon.TextCursor}
                title="Paste in Active App"
                onAction={() => pastePassword(row.value)}
              />
              <Action
                icon={Icon.Clipboard}
                title="Copy to Clipboard"
                onAction={() => copyPassword(row.value)}
              />
            </>
          )}
          <Action
            icon={toggleIcon}
            title={toggleTitle}
            onAction={() => setVisible((v) => !v)}
            shortcut={{ modifiers: ["opt"], key: "e" }}
          />
          <Action.Push
            icon={Icon.Pencil}
            title="Edit Entry"
            target={editTarget}
          />
        </ActionPanel>
      }
    />
  );
}

interface Props {
  storepath: string;
  entry: string;
}

interface PassphraseValues {
  passphrase: string;
}

export default function Content({ storepath, entry }: Props) {
  const { defaultAction } = getPreferenceValues<Preferences>();
  const [rows, setRows] = useState<VaultEntryRow[]>([]);
  const [passphrase, setPassphrase] = useState<string>();
  const [needsPassphrase, setNeedsPassphrase] = useState(
    !shouldTryAgentUnlock(storepath),
  );
  const [passphraseInput, setPassphraseInput] = useState("");
  const [passphraseError, setPassphraseError] = useState<string>();
  const [passphraseVisible, setPassphraseVisible] = useState(false);
  const [lastError, setLastError] = useState<string>();
  const [lastErrorHasGpgHelp, setLastErrorHasGpgHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(shouldTryAgentUnlock(storepath));

  function clearDecryptError() {
    setLastError(undefined);
    setLastErrorHasGpgHelp(false);
    setPassphraseError(undefined);
  }

  function formatDecryptError(error: unknown): string {
    const baseMessage =
      error instanceof RpassError
        ? `${error.code}: ${error.message}${error.details ? `\n\n${error.details}` : ""}`
        : error instanceof Error
          ? error.message
          : String(error);

    return formatGpgAwareError(baseMessage, error);
  }

  function shouldPromptForPassphrase(error: unknown) {
    return (
      (error instanceof RpassError &&
        error.code === "gpg_passphrase_required") ||
      isGpgTimeoutOrPinentryError(error)
    );
  }

  function applyLoadedContent(content: string, unlockedPassphrase?: string) {
    setRows(parseVaultEntryRows(content));
    setPassphrase(unlockedPassphrase);
    setNeedsPassphrase(false);
    clearDecryptError();
  }

  async function loadWithSubmittedPassphrase(submittedPassphrase: string) {
    setIsLoading(true);
    try {
      const content = await showEntry(entry, storepath, submittedPassphrase);
      markStoreUnlocked(storepath);
      applyLoadedContent(content, submittedPassphrase);
    } catch (error) {
      const message = formatDecryptError(error);
      setLastError(message);
      setLastErrorHasGpgHelp(isGpgTimeoutOrPinentryError(error));
      setPassphraseError(message);
      showToast(Toast.Style.Failure, "Failed to Decrypt Entry", message);
    } finally {
      setIsLoading(false);
    }
  }

  async function tryLoadWithAgent() {
    setIsLoading(true);
    try {
      const content = await showEntry(entry, storepath, undefined, {
        timeoutMs: OPTIMISTIC_AGENT_UNLOCK_TIMEOUT_MS,
      });
      applyLoadedContent(content);
    } catch (error) {
      forgetStoreUnlock(storepath);
      if (shouldPromptForPassphrase(error)) {
        setNeedsPassphrase(true);
      } else {
        const message = formatDecryptError(error);
        setLastError(message);
        setLastErrorHasGpgHelp(isGpgTimeoutOrPinentryError(error));
        setPassphraseError(message);
        showToast(Toast.Style.Failure, "Failed to Decrypt Entry", message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (shouldTryAgentUnlock(storepath)) {
      tryLoadWithAgent();
    }
  }, [entry, storepath]);

  function updatePassphraseInput(value: string) {
    setPassphraseInput(value);
    if (passphraseError) setPassphraseError(undefined);
  }

  function validatePassphrase(value: string) {
    if (!value) {
      setPassphraseError("Passphrase is required");
      return false;
    }

    setPassphraseError(undefined);
    return true;
  }

  function unlock(values: PassphraseValues) {
    if (!validatePassphrase(values.passphrase)) return;
    loadWithSubmittedPassphrase(values.passphrase);
  }

  if (needsPassphrase) {
    return (
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Unlock Entry" onSubmit={unlock} />
            <Action
              icon={passphraseVisible ? Icon.EyeDisabled : Icon.Eye}
              title={passphraseVisible ? "Hide Passphrase" : "Show Passphrase"}
              shortcut={{ modifiers: ["opt"], key: "e" }}
              onAction={() => setPassphraseVisible((visible) => !visible)}
            />
            {lastErrorHasGpgHelp ? (
              <Action.Push
                title="Show Setup Instructions"
                target={<GpgTimeoutHelp />}
              />
            ) : null}
            {lastError ? (
              <Action.CopyToClipboard title="Copy Error" content={lastError} />
            ) : null}
          </ActionPanel>
        }
      >
        {passphraseVisible ? (
          <Form.TextField
            id="passphrase"
            title="GPG Passphrase"
            placeholder="Enter GPG passphrase"
            value={passphraseInput}
            error={passphraseError}
            onChange={updatePassphraseInput}
            onBlur={(event) => validatePassphrase(event.target.value ?? "")}
          />
        ) : (
          <Form.PasswordField
            id="passphrase"
            title="GPG Passphrase"
            placeholder="Enter GPG passphrase"
            value={passphraseInput}
            error={passphraseError}
            onChange={updatePassphraseInput}
            onBlur={(event) => validatePassphrase(event.target.value ?? "")}
          />
        )}
      </Form>
    );
  }

  if (lastError) {
    return (
      <List isLoading={isLoading}>
        <List.Item
          icon={Icon.ExclamationMark}
          title="Failed to Decrypt Entry"
          subtitle={lastError}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Error" content={lastError} />
              {lastErrorHasGpgHelp ? (
                <Action.Push
                  title="Show Setup Instructions"
                  target={<GpgTimeoutHelp />}
                />
              ) : null}
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() =>
                  passphrase
                    ? loadWithSubmittedPassphrase(passphrase)
                    : tryLoadWithAgent()
                }
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const editTarget = (
    <EditEntry storepath={storepath} entry={entry} passphrase={passphrase} />
  );

  return (
    <List isLoading={isLoading}>
      {rows.map((row) =>
        row.name === "otpauth" ? (
          <OtpRow
            key={row.idx}
            entry={entry}
            storepath={storepath}
            passphrase={passphrase}
            editTarget={editTarget}
          />
        ) : (
          <EntryRow
            key={row.idx}
            row={row}
            defaultAction={defaultAction}
            editTarget={editTarget}
          />
        ),
      )}
    </List>
  );
}
