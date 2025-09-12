import { Action, ActionPanel, Form, showToast, Toast, confirmAlert } from "@raycast/api";
import { useEffect, useState } from "react";
import { findLaravelProjectRoot } from "../lib/projectLocator";
import { listEnvFiles, readEnvFile, writeEnvFile, getEnvFilePath } from "../lib/envFile";
import { formatProjectInfo } from "../lib/projectDisplay";

// Sensitive environment variable patterns
const SENSITIVE_PATTERNS = [
  /.*password.*/i,
  /.*secret.*/i,
  /.*key.*/i,
  /.*token.*/i,
  /.*auth.*/i,
  /.*api.*/i,
  /.*private.*/i,
  /.*credential.*/i,
];

function isSensitive(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

export default function EnvManager() {
  const [envFiles, setEnvFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [projectRoot, setProjectRoot] = useState<string>("");
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      const root = await findLaravelProjectRoot();
      if (!root) {
        await showToast({ style: Toast.Style.Failure, title: "No Laravel Project Found" });
        return;
      }
      setProjectRoot(root);
      const files = await listEnvFiles(root);
      setEnvFiles(files);
      const first = files[0] || ".env";
      setSelectedFile(first);
      const vars = await readEnvFile(await getEnvFilePath(root, first));
      setEnvVars(vars);
      setIsLoading(false);
    }
    load();
  }, []);

  async function handleFileChange(value: string) {
    setSelectedFile(value);
    if (!projectRoot) return;
    const vars = await readEnvFile(await getEnvFilePath(projectRoot, value));
    setEnvVars(vars);
  }

  async function handleSubmit() {
    if (!projectRoot) return;
    const path = await getEnvFilePath(projectRoot, selectedFile);
    const confirmed = await confirmAlert({
      title: "Save Environment",
      message: `Overwrite ${selectedFile}? A backup will be created.`,
    });
    if (!confirmed) return;
    await writeEnvFile(path, envVars);
    await showToast({ style: Toast.Style.Success, title: `${selectedFile} saved` });
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {projectRoot && <Form.Description title="Active Project" text={formatProjectInfo(projectRoot)} />}
      <Form.Dropdown id="file" title="Environment File" value={selectedFile} onChange={handleFileChange}>
        {envFiles.map((file) => (
          <Form.Dropdown.Item key={file} value={file} title={file} />
        ))}
      </Form.Dropdown>
      {Object.entries(envVars).map(([key, value]) => {
        const sensitive = isSensitive(key);
        const isVisible = showSensitive[key] || false;
        const displayValue = sensitive && !isVisible ? "••••••••••••••••" : value;

        return (
          <Form.TextField
            key={key}
            id={key}
            title={key}
            value={displayValue}
            onChange={(val) => setEnvVars((prev) => ({ ...prev, [key]: val }))}
            onFocus={() => {
              if (sensitive && !isVisible) {
                setShowSensitive((prev) => ({ ...prev, [key]: true }));
              }
            }}
            onBlur={() => {
              if (sensitive) {
                setShowSensitive((prev) => ({ ...prev, [key]: false }));
              }
            }}
          />
        );
      })}
    </Form>
  );
}
