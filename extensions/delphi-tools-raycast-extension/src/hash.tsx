import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import { getCliDebounceDelay } from "./utils/preferences";
import type { LaunchProps } from "@raycast/api";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getSelectedText,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { createHash } from "node:crypto";
import { useEffect, useRef, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";

type HashAlgorithm = "md5" | "sha1" | "sha256" | "sha512";

type FormValues = {
  algorithm: HashAlgorithm;
  input: string;
};

export default function Command(
  props: LaunchProps<{ arguments: Arguments.Hash }>,
) {
  return (
    <HashCommand
      initialInput={props.arguments.text}
      initialAlgorithm={getInitialAlgorithm(props.arguments.algorithm)}
    />
  );
}

function HashCommand({
  initialInput = "",
  initialAlgorithm = "sha256",
}: {
  initialInput?: string;
  initialAlgorithm?: HashAlgorithm;
}) {
  const [isDelphitoolsInstalled, setIsDelphitoolsInstalled] =
    useState<boolean>();

  useEffect(() => {
    async function checkInstallStatus() {
      const status = await getDelphitoolsInstallStatus();

      setIsDelphitoolsInstalled(status.installed);
    }

    checkInstallStatus();
  }, []);

  if (isDelphitoolsInstalled === false) {
    return <DelphitoolsInstallStatusView status={{ installed: false }} />;
  }

  return (
    <HashForm initialInput={initialInput} initialAlgorithm={initialAlgorithm} />
  );
}

function HashForm({
  initialInput,
  initialAlgorithm,
}: {
  initialInput: string;
  initialAlgorithm: HashAlgorithm;
}) {
  const [values, setValues] = useState<FormValues>({
    algorithm: initialAlgorithm,
    input: initialInput,
  });
  const [output, setOutput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const lastToastErrorRef = useRef("");
  const resultText = getResultText(output, isProcessing);
  const canCopy = Boolean(output);

  useEffect(() => {
    async function hydrateInitialInput() {
      const input = await getInitialInput();

      if (!input) {
        return;
      }

      setValues((currentValues) => {
        if (currentValues.input) {
          return currentValues;
        }

        return {
          ...currentValues,
          input,
        };
      });
    }

    hydrateInitialInput();
  }, []);

  useEffect(() => {
    if (!values.input.trim()) {
      setOutput("");
      lastToastErrorRef.current = "";
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    const timeout = setTimeout(async () => {
      try {
        const nextOutput = await runHash(values.algorithm, values.input);

        setOutput(nextOutput);
        lastToastErrorRef.current = "";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const toastErrorKey = `${values.algorithm}:${values.input}:${message}`;

        if (lastToastErrorRef.current !== toastErrorKey) {
          lastToastErrorRef.current = toastErrorKey;
          await showToast({
            style: Toast.Style.Failure,
            title: `Could not hash with ${getAlgorithmLabel(values.algorithm)}`,
            message,
          });
        }
      } finally {
        setIsProcessing(false);
      }
    }, getCliDebounceDelay());

    return () => {
      clearTimeout(timeout);
    };
  }, [values.algorithm, values.input]);

  async function copyResult() {
    if (!canCopy) {
      return;
    }

    await Clipboard.copy(output);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Hash",
    });
  }

  async function copyAsHash(algorithm: HashAlgorithm) {
    if (!values.input.trim()) {
      return;
    }

    try {
      const hash = await runHash(algorithm, values.input);

      await Clipboard.copy(hash);
      await showToast({
        style: Toast.Style.Success,
        title: `Copied ${getAlgorithmLabel(algorithm)} Hash`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Could not copy ${getAlgorithmLabel(algorithm)} hash`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Clipboard}
            title="Copy Hash"
            onAction={copyResult}
          />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Input"
            content={values.input}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
          <Action
            icon={Icon.Clipboard}
            title="Copy as MD5"
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            onAction={() => copyAsHash("md5")}
          />
          <Action
            icon={Icon.Clipboard}
            title="Copy as SHA-1"
            shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
            onAction={() => copyAsHash("sha1")}
          />
          <Action
            icon={Icon.Clipboard}
            title="Copy as SHA-256"
            shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
            onAction={() => copyAsHash("sha256")}
          />
          <Action
            icon={Icon.Clipboard}
            title="Copy as SHA-512"
            shortcut={{ modifiers: ["cmd", "shift"], key: "5" }}
            onAction={() => copyAsHash("sha512")}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="algorithm"
        title="Algorithm"
        value={values.algorithm}
        onChange={(algorithm) =>
          setValues((currentValues) => ({
            ...currentValues,
            algorithm: algorithm as HashAlgorithm,
          }))
        }
      >
        <Form.Dropdown.Item title="MD5" value="md5" />
        <Form.Dropdown.Item title="SHA-1" value="sha1" />
        <Form.Dropdown.Item title="SHA-256" value="sha256" />
        <Form.Dropdown.Item title="SHA-512" value="sha512" />
      </Form.Dropdown>
      <Form.TextArea
        id="input"
        title="Input"
        placeholder="Text to hash"
        value={values.input}
        onChange={(input) =>
          setValues((currentValues) => ({
            ...currentValues,
            input,
          }))
        }
      />

      <Form.Description title="Hash" text={resultText} />
    </Form>
  );
}

async function getInitialInput(): Promise<string> {
  try {
    const selectedText = await getSelectedText();

    if (selectedText.trim()) {
      return selectedText;
    }
  } catch {
    // Selection is optional; clipboard is the fallback source.
  }

  return (await Clipboard.readText()) ?? "";
}

async function runHash(
  algorithm: HashAlgorithm,
  input: string,
): Promise<string> {
  if (algorithm === "sha1") {
    return createHash("sha1").update(input).digest("hex");
  }

  const { stdout } = await execFileAsync(getDelphitoolsCliPath(), [
    "hash",
    "--quiet",
    algorithm,
    input,
  ]);

  return stdout.trimEnd();
}

function getInitialAlgorithm(algorithm: string | undefined): HashAlgorithm {
  if (algorithm === "md5" || algorithm === "sha1" || algorithm === "sha512") {
    return algorithm;
  }

  return "sha256";
}

function getResultText(output: string, isProcessing: boolean): string {
  if (isProcessing) {
    return output ? `${output}...` : "...";
  }

  return output || " ";
}

function getAlgorithmLabel(algorithm: HashAlgorithm): string {
  switch (algorithm) {
    case "md5":
      return "MD5";
    case "sha1":
      return "SHA-1";
    case "sha512":
      return "SHA-512";
    case "sha256":
      return "SHA-256";
  }
}
