import {
  Action,
  ActionPanel,
  Application,
  Form,
  getApplications,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Target, TargetType } from "../lib/types";

interface TargetFormProps {
  initialUsername: string;
  initialTarget?: Target;
  onSubmit: (username: string, target: Target) => void;
  // Only passed when a Quicklink already exists to paste into — offers a
  // second action that saves and immediately copies + opens Search Quicklinks,
  // so editing an existing mapping doesn't require a separate trip back out.
  onSaveAndCopyLink?: (username: string, target: Target) => void;
}

const TYPE_OPTIONS: { value: TargetType; title: string }[] = [
  { value: "app", title: "Application" },
  { value: "deeplink", title: "Raycast Command" },
  { value: "url", title: "URL" },
  { value: "path", title: "File or Folder" },
];

export function TargetForm({ initialUsername, initialTarget, onSubmit, onSaveAndCopyLink }: TargetFormProps) {
  const { pop } = useNavigation();

  const [username, setUsername] = useState(initialUsername);
  const [type, setType] = useState<TargetType>(initialTarget?.type ?? "app");
  const [appPath, setAppPath] = useState(initialTarget?.type === "app" ? initialTarget.value : "");
  const [deeplinkValue, setDeeplinkValue] = useState(initialTarget?.type === "deeplink" ? initialTarget.value : "");
  const [urlValue, setUrlValue] = useState(initialTarget?.type === "url" ? initialTarget.value : "");
  const [pathValue, setPathValue] = useState<string[]>(initialTarget?.type === "path" ? [initialTarget.value] : []);

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(true);

  useEffect(() => {
    getApplications()
      .then((apps) => setApplications(apps.sort((a, b) => a.name.localeCompare(b.name))))
      .finally(() => setIsLoadingApplications(false));
  }, []);

  function currentValue(): string {
    switch (type) {
      case "app":
        return appPath;
      case "deeplink":
        return deeplinkValue;
      case "url":
        return urlValue;
      case "path":
        return pathValue[0] ?? "";
    }
  }

  async function validate(): Promise<{ username: string; target: Target } | null> {
    const trimmedUsername = username.trim();
    const value = currentValue().trim();

    if (!trimmedUsername) {
      await showToast({ style: Toast.Style.Failure, title: "macOS username is required" });
      return null;
    }
    if (!value) {
      await showToast({ style: Toast.Style.Failure, title: "Target is required" });
      return null;
    }
    if (type === "deeplink" && !value.startsWith("raycast://")) {
      await showToast({ style: Toast.Style.Failure, title: "Expected a raycast:// deeplink" });
      return null;
    }

    return { username: trimmedUsername, target: { type, value } };
  }

  async function handleSubmit() {
    const result = await validate();
    if (!result) return;
    onSubmit(result.username, result.target);
    pop();
  }

  async function handleSubmitAndCopyLink() {
    const result = await validate();
    if (!result) return;
    onSaveAndCopyLink?.(result.username, result.target);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Mapping" icon={Icon.Check} onSubmit={handleSubmit} />
          {onSaveAndCopyLink && (
            <Action.SubmitForm
              title="Save & Copy Updated Link"
              icon={Icon.Clipboard}
              onSubmit={handleSubmitAndCopyLink}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="username"
        title="macOS Username"
        placeholder="e.g. martin"
        value={username}
        onChange={setUsername}
      />
      <Form.Dropdown id="type" title="Target Type" value={type} onChange={(value) => setType(value as TargetType)}>
        {TYPE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      {type === "app" && (
        <Form.Dropdown
          id="appPath"
          title="Application"
          isLoading={isLoadingApplications}
          value={appPath}
          onChange={setAppPath}
        >
          {applications.map((app) => (
            <Form.Dropdown.Item key={app.path} value={app.path} title={app.name} icon={{ fileIcon: app.path }} />
          ))}
        </Form.Dropdown>
      )}

      {type === "deeplink" && (
        <Form.TextField
          id="deeplinkValue"
          title="Deeplink"
          placeholder="raycast://... (copy via ⇧⌘C in Root Search)"
          value={deeplinkValue}
          onChange={setDeeplinkValue}
        />
      )}

      {type === "url" && (
        <Form.TextField id="urlValue" title="URL" placeholder="https://..." value={urlValue} onChange={setUrlValue} />
      )}

      {type === "path" && (
        <Form.FilePicker
          id="pathValue"
          title="File or Folder"
          allowMultipleSelection={false}
          canChooseDirectories={true}
          value={pathValue}
          onChange={setPathValue}
        />
      )}
    </Form>
  );
}
