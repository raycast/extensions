import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  Color,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useState } from "react";
import { execFile, spawn } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

import { existsSync } from "fs";

const COMMON_PATHS = [
  "/opt/homebrew/bin/2fa",
  "/usr/local/bin/2fa",
  "/usr/bin/2fa",
  `${process.env.HOME}/go/bin/2fa`,
];

async function getTfaPath(): Promise<string> {
  // Check common paths first
  for (const path of COMMON_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Fallback to which
  try {
    const { stdout } = await execFileAsync("/usr/bin/which", ["2fa"]);
    const path = stdout.trim();
    if (path && existsSync(path)) {
      return path;
    }
  } catch {
    // Ignore which errors
  }

  throw new Error(
    "2fa CLI not found. Please install it first: go install rsc.io/2fa@latest",
  );
}

interface FormValues {
  keyname: string;
  secret: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [keynameError, setKeynameError] = useState<string | undefined>();
  const [secretError, setSecretError] = useState<string | undefined>();

  function validateKeyname(value: string | undefined) {
    if (!value || value.trim().length === 0) {
      setKeynameError("Account name is required");
      return false;
    }
    if (/\s/.test(value)) {
      setKeynameError("Account name cannot contain spaces");
      return false;
    }
    setKeynameError(undefined);
    return true;
  }

  function validateSecret(value: string | undefined) {
    if (!value || value.trim().length === 0) {
      setSecretError("Secret key is required");
      return false;
    }
    // Base32 characters only (A-Z, 2-7, and = for padding)
    const base32Regex = /^[A-Z2-7]+=*$/i;
    const cleanedValue = value.replace(/\s/g, "").toUpperCase();
    if (!base32Regex.test(cleanedValue)) {
      setSecretError("Invalid secret key format (must be Base32)");
      return false;
    }
    setSecretError(undefined);
    return true;
  }

  async function handleSubmit(values: FormValues) {
    const isKeynameValid = validateKeyname(values.keyname);
    const isSecretValid = validateSecret(values.secret);

    if (!isKeynameValid || !isSecretValid) {
      return;
    }

    setIsLoading(true);

    try {
      const tfaPath = await getTfaPath();
      const args = ["-add", values.keyname.trim()];
      const secret = values.secret.replace(/\s/g, "").toUpperCase();

      // Use spawn to safely pipe secret via stdin without shell interpolation
      await new Promise<void>((resolve, reject) => {
        const child = spawn(tfaPath, args, { stdio: ["pipe", "pipe", "pipe"] });
        let stderr = "";

        child.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        child.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(stderr || `Process exited with code ${code}`));
          }
        });

        child.on("error", reject);

        child.stdin.write(secret + "\n");
        child.stdin.end();
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Account Added!",
        message: `${values.keyname} has been added successfully`,
      });

      await launchCommand({
        name: "list-codes",
        type: LaunchType.UserInitiated,
      });
    } catch (error) {
      const errorMessage = String(error);

      if (errorMessage.includes("already exists")) {
        showToast({
          style: Toast.Style.Failure,
          title: "Account Already Exists",
          message: `An account named "${values.keyname}" already exists`,
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Add Account",
          message: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Account"
            icon={{ source: Icon.Plus, tintColor: Color.Green }}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="keyname"
        title="Account Name"
        placeholder="github"
        info="A unique name for this 2FA account (no spaces)"
        error={keynameError}
        onChange={(value) => validateKeyname(value)}
        onBlur={(event) => validateKeyname(event.target.value)}
      />

      <Form.TextArea
        id="secret"
        title="Secret Key"
        placeholder="JBSWY3DPEHPK3PXP"
        info="The Base32-encoded secret key from your authenticator setup"
        error={secretError}
        onChange={(value) => validateSecret(value)}
        onBlur={(event) => validateSecret(event.target.value)}
      />

      <Form.Description
        title="How to get the secret key"
        text="When setting up 2FA on a service, look for an option to 'Enter manually' or 'Can't scan QR code' to reveal the secret key. It's usually a string of letters and numbers like JBSWY3DPEHPK3PXP."
      />
    </Form>
  );
}
