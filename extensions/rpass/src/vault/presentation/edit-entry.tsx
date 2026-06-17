import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  generateSecret,
  listEntries,
  OPTIMISTIC_AGENT_UNLOCK_TIMEOUT_MS,
  removeEntry,
  RpassError,
  showEntryContent,
  writeEntry,
} from "../../rpass/application/rpass-client";
import { getEntryParentFolders } from "../domain/entry-folders";
import {
  forgetStoreUnlock,
  markStoreUnlocked,
  shouldTryAgentUnlock,
} from "../infrastructure/gpg-unlock-cache";
import {
  formatGpgAwareError,
  GpgTimeoutHelp,
  isGpgTimeoutOrPinentryError,
} from "./gpg-timeout-help";

const DEFAULT_PASSWORD_LENGTH = "14";
const DEFAULT_WORDS = "4";

type SecretKind = "password" | "phrase";

interface Props {
  storepath: string;
  entry: string;
  passphrase?: string;
}

interface FormErrors {
  entryName?: string;
  password?: string;
  length?: string;
  words?: string;
  characterSet?: string;
  passphrase?: string;
}

interface PassphraseValues {
  passphrase: string;
}

function formatError(error: unknown): string {
  const message =
    error instanceof RpassError
      ? `${error.code}: ${error.message}${error.details ? `\n\n${error.details}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  return formatGpgAwareError(message, error);
}

function parsePositiveInteger(value: string): number | undefined {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return undefined;
  return parsed;
}

function normalizeEntryName(folder: string, name: string): string {
  return [folder.trim(), name.trim()]
    .filter(Boolean)
    .join("/")
    .split("/")
    .filter(Boolean)
    .join("/");
}

function splitEntryPath(entry: string): { folder: string; name: string } {
  const parts = entry.split("/").filter(Boolean);
  return {
    folder: parts.slice(0, -1).join("/"),
    name: parts.at(-1) ?? entry,
  };
}

function validateEntryName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Entry name is required";
  if (trimmed.endsWith(".gpg")) return "Entry name must not include .gpg";
  if (trimmed.includes("\\")) return "Use / as the entry separator";
  if (
    trimmed
      .split("/")
      .some((part) => part === "" || part === "." || part === "..")
  ) {
    return "Entry name must not contain empty, . or .. segments";
  }
  return undefined;
}

function passphraseParts(password: string): string[] {
  return password.split(/[-_\s]+/).filter(Boolean);
}

function inferSecretKind(password: string): SecretKind {
  const parts = passphraseParts(password);
  if (parts.length < 3) return "password";

  const wordParts = parts.filter((part) => /^[a-z]+$/i.test(part));
  const numericParts = parts.filter((part) => /^\d+$/.test(part));
  return wordParts.length >= 3 &&
    wordParts.length + numericParts.length === parts.length
    ? "phrase"
    : "password";
}

function inferPassphraseOptions(password: string): {
  words: string;
  capitalize: boolean;
  number: boolean;
} {
  const parts = passphraseParts(password);
  const wordParts = parts.filter((part) => /^[a-z]+$/i.test(part));
  const numericParts = parts.filter((part) => /^\d+$/.test(part));

  return {
    words: String(wordParts.length || Number(DEFAULT_WORDS)),
    capitalize: wordParts.some((part) => /^[A-Z]/.test(part)),
    number: numericParts.length > 0,
  };
}

export default function EditEntry({ storepath, entry, passphrase }: Props) {
  const initialPath = splitEntryPath(entry);
  const [folders, setFolders] = useState<string[]>(() =>
    getEntryParentFolders([entry]),
  );
  const [selectedFolder, setSelectedFolder] = useState(initialPath.folder);
  const [entryName, setEntryName] = useState(initialPath.name);
  const [password, setPassword] = useState("");
  const [additionalLines, setAdditionalLines] = useState("");
  const [kind, setKind] = useState<SecretKind>("password");
  const [length, setLength] = useState(DEFAULT_PASSWORD_LENGTH);
  const [lowercase, setLowercase] = useState(true);
  const [uppercase, setUppercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [words, setWords] = useState(DEFAULT_WORDS);
  const [capitalize, setCapitalize] = useState(false);
  const [appendNumber, setAppendNumber] = useState(false);
  const [isLoading, setIsLoading] = useState(
    passphrase !== undefined || shouldTryAgentUnlock(storepath),
  );
  const [needsPassphrase, setNeedsPassphrase] = useState(
    passphrase === undefined && !shouldTryAgentUnlock(storepath),
  );
  const [unlockPassphrase, setUnlockPassphrase] = useState<string>();
  const [passphraseInput, setPassphraseInput] = useState("");
  const [passphraseVisible, setPassphraseVisible] = useState(false);
  const [lastError, setLastError] = useState<string>();
  const [lastErrorHasGpgHelp, setLastErrorHasGpgHelp] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const didMountOptionsRef = useRef(false);
  const skipNextOptionsRegenerateRef = useRef(false);
  const newEntry = normalizeEntryName(selectedFolder, entryName);

  useEffect(() => {
    let cancelled = false;
    listEntries(storepath)
      .then((entries) => {
        if (!cancelled) {
          setFolders(getEntryParentFolders([...entries, entry]));
        }
      })
      .catch(() => {
        if (!cancelled) setFolders(getEntryParentFolders([entry]));
      });

    return () => {
      cancelled = true;
    };
  }, [entry, storepath]);

  function shouldPromptForPassphrase(error: unknown): boolean {
    return (
      (error instanceof RpassError &&
        error.code === "gpg_passphrase_required") ||
      isGpgTimeoutOrPinentryError(error)
    );
  }

  function applyLoadedContent(
    content: Awaited<ReturnType<typeof showEntryContent>>,
  ) {
    setPassword(content.password);
    skipNextOptionsRegenerateRef.current = true;
    const inferredKind = inferSecretKind(content.password);
    setKind(inferredKind);
    if (inferredKind === "phrase") {
      const options = inferPassphraseOptions(content.password);
      setWords(options.words);
      setCapitalize(options.capitalize);
      setAppendNumber(options.number);
    } else {
      setLowercase(true);
      setUppercase(true);
      setNumbers(true);
      setSymbols(true);
    }
    setNeedsPassphrase(false);
    setLastError(undefined);
    setLastErrorHasGpgHelp(false);
    setAdditionalLines(
      [
        ...content.fields.map((field) => `${field.name}: ${field.value}`),
        content.otp_uri,
        ...content.extra_lines,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  useEffect(() => {
    const submittedPassphrase = unlockPassphrase ?? passphrase;
    const canTryAgent =
      submittedPassphrase === undefined && shouldTryAgentUnlock(storepath);

    if (submittedPassphrase === undefined && !canTryAgent) {
      setNeedsPassphrase(true);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLastError(undefined);
      setLastErrorHasGpgHelp(false);
      try {
        const content = await showEntryContent(
          entry,
          storepath,
          submittedPassphrase,
          canTryAgent
            ? { timeoutMs: OPTIMISTIC_AGENT_UNLOCK_TIMEOUT_MS }
            : undefined,
        );
        if (cancelled) return;

        if (submittedPassphrase !== undefined) {
          markStoreUnlocked(storepath);
        }
        applyLoadedContent(content);
      } catch (error) {
        if (!cancelled) {
          if (canTryAgent) forgetStoreUnlock(storepath);

          if (shouldPromptForPassphrase(error)) {
            setNeedsPassphrase(true);
          } else {
            const message = formatError(error);
            setLastError(message);
            setLastErrorHasGpgHelp(isGpgTimeoutOrPinentryError(error));
            setErrors((current) => ({ ...current, passphrase: message }));
            await showToast(
              Toast.Style.Failure,
              "Failed to Load Entry",
              message,
            );
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [entry, passphrase, storepath, unlockPassphrase]);

  function validateSecretOptions(): boolean {
    const nextErrors: FormErrors = {};

    if (kind === "password") {
      const parsedLength = parsePositiveInteger(length);
      if (parsedLength === undefined || parsedLength > 1024) {
        nextErrors.length = "Password length must be between 1 and 1024";
      }
      if (!lowercase && !uppercase && !numbers && !symbols) {
        nextErrors.characterSet = "Enable at least one character set";
      }
    } else {
      const parsedWords = parsePositiveInteger(words);
      if (parsedWords === undefined || parsedWords > 20) {
        nextErrors.words = "Word count must be between 1 and 20";
      }
    }

    setErrors(nextErrors);
    return Object.values(nextErrors).every((error) => error === undefined);
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    nextErrors.entryName = validateEntryName(entryName);
    if (!password) nextErrors.password = "Password is required";
    setErrors(nextErrors);
    return Object.values(nextErrors).every((error) => error === undefined);
  }

  function validatePassphrase(value: string): boolean {
    if (!value) {
      setErrors((current) => ({
        ...current,
        passphrase: "Passphrase is required",
      }));
      return false;
    }

    setErrors((current) => ({ ...current, passphrase: undefined }));
    return true;
  }

  function unlock(values: PassphraseValues) {
    if (!validatePassphrase(values.passphrase)) return;
    setUnlockPassphrase(values.passphrase);
    setNeedsPassphrase(false);
  }

  async function regenerateSecret() {
    if (!validateSecretOptions()) return;

    setIsLoading(true);
    setLastError(undefined);
    setLastErrorHasGpgHelp(false);
    try {
      const result = await generateSecret(
        kind === "phrase"
          ? {
              kind: "phrase",
              words: Number(words),
              capitalize,
              number: appendNumber,
            }
          : {
              kind: "password",
              length: Number(length),
              lowercase,
              uppercase,
              numbers,
              symbols,
            },
      );
      setPassword(result.password);
    } catch (error) {
      const message = formatError(error);
      setLastError(message);
      setLastErrorHasGpgHelp(isGpgTimeoutOrPinentryError(error));
      await showToast(
        Toast.Style.Failure,
        "Failed to Generate Secret",
        message,
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!didMountOptionsRef.current) {
      didMountOptionsRef.current = true;
      return;
    }

    if (skipNextOptionsRegenerateRef.current) {
      skipNextOptionsRegenerateRef.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      regenerateSecret();
    }, 300);

    return () => clearTimeout(timeout);
  }, [
    kind,
    length,
    lowercase,
    uppercase,
    numbers,
    symbols,
    words,
    capitalize,
    appendNumber,
  ]);

  async function save() {
    if (!validate()) return;

    const isMoving = newEntry !== entry;
    const confirmed = await confirmAlert({
      title: isMoving ? "Move and Update Entry?" : "Update Entry?",
      message: isMoving
        ? `Move '${entry}' to '${newEntry}' and update its content?`
        : `Overwrite '${entry}' with the edited content?`,
      primaryAction: {
        title: isMoving ? "Move and Update Entry" : "Update Entry",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (!confirmed) return;

    setIsLoading(true);
    setLastError(undefined);
    setLastErrorHasGpgHelp(false);
    try {
      const content = [password, additionalLines.trim()]
        .filter(Boolean)
        .join("\n");
      await writeEntry(newEntry, storepath, content, { force: true });
      if (isMoving) {
        await removeEntry(entry, storepath);
      }
      await showToast(
        Toast.Style.Success,
        isMoving ? "Entry Moved and Updated" : "Entry Updated",
        newEntry,
      );
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      const message = formatError(error);
      setLastError(message);
      setLastErrorHasGpgHelp(isGpgTimeoutOrPinentryError(error));
      await showToast(Toast.Style.Failure, "Failed to Update Entry", message);
    } finally {
      setIsLoading(false);
    }
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
              <Action.CopyToClipboard
                title="Copy Last Error"
                content={lastError}
              />
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
            error={errors.passphrase}
            onChange={(value) => {
              setPassphraseInput(value);
              if (errors.passphrase)
                setErrors((current) => ({ ...current, passphrase: undefined }));
            }}
            onBlur={(event) => validatePassphrase(event.target.value ?? "")}
          />
        ) : (
          <Form.PasswordField
            id="passphrase"
            title="GPG Passphrase"
            placeholder="Enter GPG passphrase"
            value={passphraseInput}
            error={errors.passphrase}
            onChange={(value) => {
              setPassphraseInput(value);
              if (errors.passphrase)
                setErrors((current) => ({ ...current, passphrase: undefined }));
            }}
            onBlur={(event) => validatePassphrase(event.target.value ?? "")}
          />
        )}
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.CheckCircle}
            title="Update Entry"
            onSubmit={save}
          />
          <Action
            icon={Icon.ArrowClockwise}
            title="Regenerate Secret"
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={regenerateSecret}
          />
          {lastErrorHasGpgHelp ? (
            <Action.Push
              title="Show Setup Instructions"
              target={<GpgTimeoutHelp />}
            />
          ) : null}
          {lastError ? (
            <Action.CopyToClipboard
              title="Copy Last Error"
              content={lastError}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="folder"
        title="Folder"
        value={selectedFolder}
        onChange={setSelectedFolder}
      >
        <Form.Dropdown.Item value="" title="No Folder" />
        {folders.map((folder) => (
          <Form.Dropdown.Item key={folder} value={folder} title={folder} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="entryName"
        title="Entry Name"
        value={entryName}
        error={errors.entryName}
        onChange={(value) => {
          setEntryName(value);
          if (errors.entryName)
            setErrors((current) => ({ ...current, entryName: undefined }));
        }}
        onBlur={() =>
          setErrors((current) => ({
            ...current,
            entryName: validateEntryName(entryName),
          }))
        }
      />
      <Form.Description text={`Entry path: ${newEntry || "—"}`} />
      <Form.TextField
        id="password"
        title="Password"
        value={password}
        error={errors.password}
        onChange={(value) => {
          setPassword(value);
          if (errors.password)
            setErrors((current) => ({ ...current, password: undefined }));
        }}
      />
      <Form.TextArea
        id="additionalLines"
        title="Additional Lines"
        info="Key: value format per line."
        value={additionalLines}
        onChange={setAdditionalLines}
      />
      <Form.Separator />
      <Form.Dropdown
        id="kind"
        title="Regenerate Type"
        value={kind}
        onChange={(value) => setKind(value as SecretKind)}
      >
        <Form.Dropdown.Item value="password" title="Password" />
        <Form.Dropdown.Item value="phrase" title="Passphrase" />
      </Form.Dropdown>
      {kind === "password" ? (
        <>
          <Form.TextField
            id="length"
            title="Length"
            value={length}
            error={errors.length}
            onChange={(value) => {
              setLength(value);
              if (errors.length)
                setErrors((current) => ({ ...current, length: undefined }));
            }}
          />
          <Form.Checkbox
            id="lowercase"
            label="Lowercase"
            value={lowercase}
            onChange={setLowercase}
          />
          <Form.Checkbox
            id="uppercase"
            label="Uppercase"
            value={uppercase}
            onChange={setUppercase}
          />
          <Form.Checkbox
            id="numbers"
            label="Numbers"
            value={numbers}
            onChange={setNumbers}
          />
          <Form.Checkbox
            id="symbols"
            label="Symbols"
            value={symbols}
            onChange={setSymbols}
          />
          {errors.characterSet ? (
            <Form.Description text={errors.characterSet} />
          ) : null}
        </>
      ) : (
        <>
          <Form.TextField
            id="words"
            title="Words"
            value={words}
            error={errors.words}
            onChange={(value) => {
              setWords(value);
              if (errors.words)
                setErrors((current) => ({ ...current, words: undefined }));
            }}
          />
          <Form.Checkbox
            id="capitalize"
            label="Capitalize Words"
            value={capitalize}
            onChange={setCapitalize}
          />
          <Form.Checkbox
            id="number"
            label="Append Number"
            value={appendNumber}
            onChange={setAppendNumber}
          />
        </>
      )}
    </Form>
  );
}
