import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execa, execaCommand } from "execa";
import { safeParse } from "valibot";

import {
  CLINotFoundError,
  CLINotLoggedInError,
  CLIVersionNotSupportedError,
  MasterPasswordMissingError,
  ParseError,
  TimeoutError,
  captureException,
  getErrorAction,
  getErrorString,
} from "@/helper/error";
import { VaultCredential, VaultCredentialSchema, VaultNote, VaultNoteSchema } from "@/types/dcli";

const preferences = getPreferenceValues<Preferences>();

const CLI_PATH = preferences.cliPath;
const CLI_VERSION = getCLIVersion();

async function dcli(...args: string[]) {
  if (!CLI_PATH) {
    throw new CLINotFoundError();
  }

  if ((await CLI_VERSION) === "6.2415.0") {
    throw new CLIVersionNotSupportedError("Dashlane CLI version 6.2415.0 not supported");
  }

  const { stdout } = await execa(CLI_PATH, args, {
    timeout: 15_000,
    ...(preferences.masterPassword && {
      env: {
        DASHLANE_MASTER_PASSWORD: preferences.masterPassword,
      },
    }),
  }).catch((error) => {
    if (error.timedOut) {
      if (error.stderr.includes("Please enter your master password")) {
        throw new MasterPasswordMissingError(error.stack ?? error.message);
      }

      if (error.stderr.includes("Please enter your email address")) {
        throw new CLINotLoggedInError(error.stack ?? error.message);
      }

      throw new TimeoutError(error.stack ?? error.message);
    }

    throw error;
  });

  if (preferences.biometrics) {
    execaCommand("open -a Raycast.app");
  }

  return stdout;
}

export async function syncVault() {
  try {
    await dcli("sync");
  } catch (error) {
    captureException(error);
    throw error;
  }
}

export async function getVaultCredentials() {
  try {
    const stdout = await dcli("password", "--output", "json");
    return parseVaultCredentials(stdout);
  } catch (error) {
    captureException(error);
    await showFailureToast(error, {
      primaryAction: getErrorAction(error),
    });
  }
}

export async function getNotes() {
  try {
    const stdout = await dcli("note", "--output", "json");
    return parseNotes(stdout);
  } catch (error) {
    captureException(error);
    await showFailureToast(error, {
      primaryAction: getErrorAction(error),
    });
  }
}

export async function getPassword(id: string) {
  try {
    const stdout = await dcli("read", `dl://${extractId(id)}/password`);
    return stdout.trim();
  } catch (error) {
    captureException(error);
    throw error;
  }
}

export async function getOtpSecret(id: string) {
  try {
    const result = await dcli("read", `dl://${extractId(id)}/otpSecret?otp+expiry`);
    const [otp, expireIn] = result.split(" ").map((item) => item.trim());
    return {
      otp,
      expireIn,
    };
  } catch (error) {
    captureException(error);
    throw error;
  }
}

function parseVaultCredentials(jsonString: string): VaultCredential[] {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      throw new ParseError("Could not parse vault credentials", "CLI response is not an list of credentials");
    }

    const credentials: VaultCredential[] = [];
    for (const item of parsed) {
      const result = safeParse(VaultCredentialSchema, item);
      if (result.success) credentials.push(result.output);
    }

    if (credentials.length === 0 && parsed.length > 0) {
      throw new ParseError("Could not parse vault credentials", "No element in the list is valid");
    }

    return credentials;
  } catch (error) {
    throw new ParseError("Could not parse vault credentials", getErrorString(error));
  }
}

function parseNotes(jsonString: string): VaultNote[] {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      throw new ParseError("Could not parse vault notes", "CLI response is not an list of notes");
    }

    const notes: VaultNote[] = [];
    for (const item of parsed) {
      if (item.attachments && typeof item.attachments === "string") {
        try {
          item.attachments = JSON.parse(item.attachments);
        } catch (error) {
          // Do nothing
        }
      }

      const result = safeParse(VaultNoteSchema, item);
      if (result.success) notes.push(result.output);
    }

    if (notes.length === 0 && parsed.length > 0) {
      throw new ParseError("Could not parse vault notes", "No element in the list is valid");
    }

    return notes;
  } catch (error) {
    throw new ParseError("Could not parse vault notes", getErrorString(error));
  }
}

/**
 * Dashlane CLI returns the ID in the format of `{id}`.
 * @returns Id without curly braces.
 */
function extractId(id: string) {
  if (id.startsWith("{") && id.endsWith("}")) {
    return id.slice(1, -1);
  }
  return id;
}

async function getCLIVersion() {
  try {
    if (!CLI_PATH) {
      throw new CLINotFoundError();
    }

    const result = await execa(CLI_PATH, ["--version"]);
    return result.stdout;
  } catch (error) {
    return undefined;
  }
}
