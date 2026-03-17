import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Detail, Icon } from "@raycast/api";
import { useState } from "react";
import { generateSSHKey } from "./utils/ssh";

import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export default function Command() {
  const { push } = useNavigation();
  const [storageMode, setStorageMode] = useState<string>("file");
  const [algorithm, setAlgorithm] = useState<string>("ed25519");
  const [filename, setFilename] = useState<string>("id_ed25519");
  const [isLoading, setIsLoading] = useState(false);

  function getDefaultAlgorithm(mode: string) {
    return mode === "hardware" ? "ed25519-sk" : "ed25519";
  }

  function getDefaultFilename(selectedAlgorithm: string) {
    if (selectedAlgorithm === "ed25519") return "id_ed25519";
    if (selectedAlgorithm === "ecdsa") return "id_ecdsa";
    if (selectedAlgorithm === "ed25519-sk") return "id_ed25519_sk";
    if (selectedAlgorithm === "ecdsa-sk") return "id_ecdsa_sk";
    return `id_${selectedAlgorithm.replace(/-/g, "_")}`;
  }

  function handleStorageModeChange(nextStorageMode: string) {
    const nextAlgorithm = getDefaultAlgorithm(nextStorageMode);
    const previousDefaultFilename = getDefaultFilename(algorithm);
    const nextDefaultFilename = getDefaultFilename(nextAlgorithm);

    setStorageMode(nextStorageMode);
    setAlgorithm(nextAlgorithm);
    setFilename((currentFilename) =>
      currentFilename === previousDefaultFilename ? nextDefaultFilename : currentFilename,
    );
  }

  function handleAlgorithmChange(nextAlgorithm: string) {
    const previousDefaultFilename = getDefaultFilename(algorithm);
    const nextDefaultFilename = getDefaultFilename(nextAlgorithm);

    setAlgorithm(nextAlgorithm);
    setFilename((currentFilename) =>
      currentFilename === previousDefaultFilename ? nextDefaultFilename : currentFilename,
    );
  }

  async function handleSubmit(values: {
    algorithm?: string;
    storageMode: string;
    filename: string;
    comment: string;
    passphrase?: string;
  }) {
    const filename = values.filename.trim();
    if (filename === "" || filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid filename",
        message: "Filename must not be empty or contain path separators/traversal.",
      });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: values.storageMode === "hardware" ? "Waiting for security key..." : "Generating key...",
      message: values.storageMode === "hardware" ? "Please touch your hardware key" : undefined,
    });

    try {
      const sshDir = path.join(os.homedir(), ".ssh");
      const pubPath = path.join(sshDir, `${filename}.pub`);

      let publicKeyContent = "";

      await generateSSHKey({
        name: filename,
        algorithm: values.algorithm || "ed25519",
        comment: values.comment,
        passphrase: values.passphrase,
      });

      publicKeyContent = await fs.readFile(pubPath, "utf-8");

      toast.style = Toast.Style.Success;
      toast.title = "Key generated successfully";

      push(
        <ConfirmationView
          name={filename}
          pubPath={pubPath}
          pubContent={publicKeyContent}
          privPath={path.join(sshDir, filename)}
        />,
      );
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to generate key";
      toast.message = (error as Error).message;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Key" onSubmit={handleSubmit} shortcut={{ modifiers: ["cmd"], key: "g" }} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="storageMode" title="Storage Mode" value={storageMode} onChange={handleStorageModeChange}>
        <Form.Dropdown.Item value="file" title="📁 Direct File (Standard)" />
        <Form.Dropdown.Item value="hardware" title="🔑 Hardware Security Key (FIDO)" />
      </Form.Dropdown>

      <Form.Dropdown
        key={storageMode}
        id="algorithm"
        title="Algorithm"
        value={algorithm}
        onChange={handleAlgorithmChange}
      >
        {storageMode === "hardware" ? (
          <>
            <Form.Dropdown.Item value="ed25519-sk" title="Ed25519-SK" />
            <Form.Dropdown.Item value="ecdsa-sk" title="ECDSA-SK" />
          </>
        ) : (
          <>
            <Form.Dropdown.Item value="ed25519" title="Ed25519" />
            <Form.Dropdown.Item value="ecdsa" title="ECDSA" />
          </>
        )}
      </Form.Dropdown>

      <Form.TextField id="filename" title="Filename" placeholder="id_ed25519" value={filename} onChange={setFilename} />

      <Form.TextField id="comment" title="Comment" placeholder="Optional comment" />

      {storageMode === "file" && (
        <Form.PasswordField id="passphrase" title="Passphrase" placeholder="Optional passphrase" />
      )}
    </Form>
  );
}

function ConfirmationView(props: { name: string; pubPath: string; pubContent: string; privPath: string }) {
  return (
    <Detail
      markdown={`# 🎉 Key Generated: ${props.name}\n\n**Public Key Path:**  \n\`${props.pubPath}\`  \n\n**Public Key Value:**  \n\`\`\`\n${props.pubContent}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Public Key"
            content={props.pubContent}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />

          <Action
            title="Reveal in Finder"
            icon={Icon.Finder}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={async () => {
              try {
                await execFileAsync("open", ["-R", props.pubPath]);
              } catch (error) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to reveal file",
                  message: (error as Error).message,
                });
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}
