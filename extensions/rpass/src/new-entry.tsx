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
import { useEffect, useMemo, useState } from "react";
import { configureRpassClientFromPreferences } from "./rpass/application/configure-rpass-client";
import {
  doctor,
  generateSecret,
  listEntries,
  RpassError,
  writeEntry,
  type GenerateEntryOptions,
} from "./rpass/application/rpass-client";
import { getEntryParentFolders } from "./vault/domain/entry-folders";
import { resolveStorePath } from "./vault/application/store-path";
import { copyPassword } from "./vault/presentation/clipboard";
import checkInstall from "./vault/presentation/check-install";
import SetupPasswordStore, {
  type PasswordStoreSetupReason,
} from "./vault/presentation/setup-password-store";

const DEFAULT_PASSWORD_LENGTH = "14";
const DEFAULT_WORDS = "4";

type SecretKind = "password" | "phrase";

interface FormErrors {
  name?: string;
  length?: string;
  words?: string;
  characterSet?: string;
}

function formatError(error: unknown): string {
  if (error instanceof RpassError) {
    const details = error.details ? `\n\n${error.details}` : "";
    if (
      error.code === "rpass_failed" &&
      error.details?.includes("unexpected argument") &&
      error.details.includes("Usage: rpass [OPTIONS] [ENTRY] [COMMAND]")
    ) {
      return `rpass generate is not available in the configured rpass binary. Update rpass or set the extension preference to a newer rpass executable.${details}`;
    }

    return `${error.code}: ${error.message}${details}`;
  }

  if (error instanceof Error) return error.message;
  return String(error);
}

function normalizeEntryName(folder: string, name: string): string {
  const parts = [folder.trim(), name.trim()]
    .filter(Boolean)
    .join("/")
    .split("/")
    .filter(Boolean);

  return parts.join("/");
}

function getSetupReason(error: unknown): PasswordStoreSetupReason | undefined {
  if (!(error instanceof RpassError)) return undefined;
  if (error.code === "store_not_found") return "store_missing";
  if (error.code === "gpg_id_not_found") return "gpg_id_missing";
  return undefined;
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

function parsePositiveInteger(value: string): number | undefined {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
}

export default function Command() {
  configureRpassClientFromPreferences();
  const storepath = resolveStorePath();
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [entryName, setEntryName] = useState("");
  const [kind, setKind] = useState<SecretKind>("password");
  const [length, setLength] = useState(DEFAULT_PASSWORD_LENGTH);
  const [lowercase, setLowercase] = useState(true);
  const [uppercase, setUppercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [words, setWords] = useState(DEFAULT_WORDS);
  const [capitalize, setCapitalize] = useState(false);
  const [appendNumber, setAppendNumber] = useState(false);
  const [generatedSecret, setGeneratedSecret] = useState("");
  const [additionalLines, setAdditionalLines] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string>();
  const [setupReason, setSetupReason] = useState<PasswordStoreSetupReason>();
  const [errors, setErrors] = useState<FormErrors>({});

  const entry = useMemo(
    () => normalizeEntryName(selectedFolder, entryName),
    [entryName, selectedFolder],
  );

  useEffect(() => {
    checkInstall();
  }, []);

  useEffect(() => {
    let cancelled = false;
    doctor(storepath)
      .then((report) => {
        if (!cancelled) {
          if (
            report.checks.some(
              (check) => check.name === "store_directory" && !check.ok,
            )
          ) {
            setSetupReason("store_missing");
          } else if (
            report.checks.some((check) => check.name === "gpg_id" && !check.ok)
          ) {
            setSetupReason("gpg_id_missing");
          } else {
            setSetupReason(undefined);
          }
        }
      })
      .catch(() => {
        // Older rpass versions may not support doctor; writes still surface setup errors.
      });

    listEntries(storepath)
      .then((entries) => {
        if (!cancelled) setFolders(getEntryParentFolders(entries));
      })
      .catch((error) => {
        if (!cancelled) {
          const reason = getSetupReason(error);
          if (reason) {
            setSetupReason(reason);
          } else {
            const message = formatError(error);
            setLastError(message);
            showToast(Toast.Style.Failure, "Failed to Load Folders", message);
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [storepath]);

  function generateOptions(force = false): GenerateEntryOptions {
    return kind === "phrase"
      ? {
          kind: "phrase",
          words: Number(words),
          capitalize,
          number: appendNumber,
          force,
        }
      : {
          kind: "password",
          length: Number(length),
          lowercase,
          uppercase,
          numbers,
          symbols,
          force,
        };
  }

  async function regenerateSecret(): Promise<string | undefined> {
    if (!validateSecretOptions()) return undefined;

    setIsLoading(true);
    setLastError(undefined);
    try {
      const result = await generateSecret(generateOptions());
      setGeneratedSecret(result.password);
      return result.password;
    } catch (error) {
      const message = formatError(error);
      setLastError(message);
      await showToast(
        Toast.Style.Failure,
        "Failed to Generate Secret",
        message,
      );
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm(): void {
    setSelectedFolder("");
    setEntryName("");
    setKind("password");
    setLength(DEFAULT_PASSWORD_LENGTH);
    setLowercase(true);
    setUppercase(true);
    setNumbers(true);
    setSymbols(true);
    setWords(DEFAULT_WORDS);
    setCapitalize(false);
    setAppendNumber(false);
    setGeneratedSecret("");
    setAdditionalLines("");
    setErrors({});
  }

  function validateSecretOptions(): boolean {
    const nextErrors: FormErrors = { name: errors.name };

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
    return Object.entries(nextErrors)
      .filter(([key]) => key !== "name")
      .every(([, error]) => error === undefined);
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    nextErrors.name = validateEntryName(entryName);

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

  async function submit({ force = false }: { force?: boolean } = {}) {
    if (!validate()) return;

    const secret = generatedSecret;

    const confirmed = await confirmAlert({
      title: force ? "Overwrite Entry?" : "Create Entry?",
      message: `${force ? "Overwrite" : "Create"} '${entry}' in the password store?`,
      primaryAction: {
        title: force ? "Overwrite Entry" : "Create Entry",
        style: force
          ? Alert.ActionStyle.Destructive
          : Alert.ActionStyle.Default,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (!confirmed) return;

    setIsLoading(true);
    setLastError(undefined);
    setSetupReason(undefined);
    try {
      const content = [secret, additionalLines.trim()].join("\n");
      await writeEntry(entry, storepath, content, { force });
      resetForm();
      if (secret) await copyPassword(secret);
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      const message = formatError(error);
      setLastError(message);
      setSetupReason(getSetupReason(error));
      await showToast(Toast.Style.Failure, "Failed to Create Entry", message);
    } finally {
      setIsLoading(false);
    }
  }

  function updateEntryName(value: string) {
    setEntryName(value);
    if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
  }

  useEffect(() => {
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

  if (setupReason) {
    return (
      <SetupPasswordStore
        storepath={storepath}
        reason={setupReason}
        onDone={() => setSetupReason(undefined)}
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Plus}
            title="Create and Copy Secret"
            onSubmit={() => submit()}
          />
          <Action
            icon={Icon.ArrowClockwise}
            title="Regenerate Secret"
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={regenerateSecret}
          />
          <Action.SubmitForm
            icon={Icon.ExclamationMark}
            title="Overwrite Existing Entry"
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            onSubmit={() => submit({ force: true })}
          />
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
        id="kind"
        title="Type"
        value={kind}
        onChange={(value) => setKind(value as SecretKind)}
      >
        <Form.Dropdown.Item value="password" title="Password" />
        <Form.Dropdown.Item value="phrase" title="Passphrase" />
      </Form.Dropdown>

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
        placeholder="example/login"
        value={entryName}
        error={errors.name}
        onChange={updateEntryName}
        onBlur={() =>
          setErrors((current) => ({
            ...current,
            name: validateEntryName(entryName),
          }))
        }
      />

      <Form.Description text={`Entry path: ${entry || "—"}`} />
      <Form.TextField
        id="generatedSecret"
        title="Generated Secret"
        value={generatedSecret}
        onChange={setGeneratedSecret}
      />
      <Form.TextArea
        id="additionalLines"
        title="Additional Lines"
        info="Key: value format per line."
        value={additionalLines}
        onChange={setAdditionalLines}
      />
      <Form.Separator />

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
