import {
  ActionPanel,
  Action,
  Clipboard,
  Detail,
  Form,
  Icon,
  LocalStorage,
  Toast,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { addToHistory, removeFromHistory, type PushKind, type PushRecord } from "./utils/history";
import { resolveApiKeyForRecord, serverUrlsMatch } from "./utils/credentials";
import {
  DEFAULT_EXPIRE_DURATION,
  DEFAULT_EXPIRE_VIEWS,
  DURATION_LABELS,
  PUBLIC_SERVER_URL,
  type PushCreateRequest,
  type Workspace,
  buildBaseUrl,
  createPush,
  expirePush,
  extractPushUrl,
  fetchWorkspaces,
} from "./utils/pwpush";
import { validateDurationIndex, validateOptionalUrl, validatePositiveInteger } from "./utils/validation";

const ONBOARDING_KEY = "pwpush_onboarding_seen";

function resolveServerUrl(serverUrl: string | undefined): { url: string; error: string | null } {
  try {
    return { url: buildBaseUrl(serverUrl), error: null };
  } catch (error) {
    return { url: PUBLIC_SERVER_URL, error: error instanceof Error ? error.message : "Invalid server URL" };
  }
}

type CreatePushFormValues = {
  kind: PushKind;
  payload: string;
  files?: string[];
  name?: string;
  note?: string;
  expireAfterDuration?: string;
  expireAfterViews?: string;
  passphrase?: string;
  deletableByViewer: boolean;
  retrievalStep: boolean;
  workspaceId?: string;
};

export default function CreatePushCommand() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const [pushKind, setPushKind] = useState<PushKind>("text");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [serverUrl, setServerUrl] = useState<string>(() => resolveServerUrl(preferences.serverUrl).url);
  const [serverUrlError, setServerUrlError] = useState<string | null>(
    () => resolveServerUrl(preferences.serverUrl).error,
  );

  useEffect(() => {
    const resolved = resolveServerUrl(preferences.serverUrl);
    setServerUrl(resolved.url);
    setServerUrlError(resolved.error);
  }, [preferences.serverUrl]);

  useEffect(() => {
    LocalStorage.getItem<string>(ONBOARDING_KEY).then((value) => {
      setHasSeenOnboarding(value === "true");
    });
  }, []);

  const { data: workspaces, isLoading: isLoadingWorkspaces } = useCachedPromise(
    async (baseUrl: string, key?: string, urlError?: string | null): Promise<Workspace[]> => {
      if (urlError) return [];
      if (!key?.trim()) return [];
      return fetchWorkspaces(baseUrl, key);
    },
    [serverUrl, preferences.apiKey, serverUrlError],
  );

  async function handleSubmit(values: CreatePushFormValues) {
    if (isSubmitting) return;

    if (serverUrlError) {
      await showToast({ style: Toast.Style.Failure, title: serverUrlError });
      return;
    }

    const payload = values.payload ?? "";

    if (values.kind === "file") {
      if (!values.files || values.files.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: "Select at least one file" });
        return;
      }
    } else if (payload.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Payload is required" });
      return;
    }

    if (values.kind === "url" && !validateOptionalUrl(payload)) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a valid URL" });
      return;
    }

    const duration = validateDurationIndex(values.expireAfterDuration, DEFAULT_EXPIRE_DURATION);
    const views = validatePositiveInteger(values.expireAfterViews, DEFAULT_EXPIRE_VIEWS);

    if (duration === null || views === null) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Duration and views must be valid positive integers",
      });
      return;
    }

    const workspaceId = values.workspaceId ? Number(values.workspaceId) : undefined;

    const pushRequest: PushCreateRequest = {
      payload,
      expire_after_duration: duration,
      expire_after_views: views,
      name: values.name?.trim() || undefined,
      note: values.note?.trim() || undefined,
      passphrase: values.passphrase?.trim() || undefined,
      deletable_by_viewer: values.deletableByViewer,
      retrieval_step: values.retrievalStep,
      kind: values.kind,
      files: values.files?.length ? values.files : undefined,
    };

    if (pushRequest.files?.length && !preferences.apiKey?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "File attachments require an API key",
        message: "Add your API key in extension preferences.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createPush(preferences.serverUrl, preferences.apiKey, pushRequest, workspaceId);
      const pushUrl = extractPushUrl(serverUrl, result);

      if (!pushUrl) {
        throw new Error("Invalid response from PwPush: missing URL");
      }

      await Clipboard.copy(pushUrl, { concealed: true });
      await showToast({ style: Toast.Style.Success, title: "Push URL copied to clipboard" });

      const record: PushRecord = {
        url: pushUrl,
        urlToken: result.url_token,
        name: result.name ?? undefined,
        note: result.note ?? undefined,
        kind: values.kind,
        expiresAt: result.expires_at ?? undefined,
        viewsRemaining: result.views_remaining,
        createdAt: result.created_at,
        serverUrl,
      };

      await addToHistory(record);
      push(<PushResultView record={record} />);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to create push" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function dismissOnboarding() {
    await LocalStorage.setItem(ONBOARDING_KEY, "true");
    setHasSeenOnboarding(true);
  }

  if (hasSeenOnboarding === null) {
    return <Detail isLoading={true} markdown="" />;
  }

  if (!hasSeenOnboarding) {
    return (
      <Detail
        markdown={ONBOARDING_MARKDOWN}
        actions={
          <ActionPanel>
            <Action title="Create Push" icon={Icon.Plus} onAction={dismissOnboarding} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const workspaceDropdown =
    workspaces && workspaces.length > 0 ? (
      <Form.Dropdown id="workspaceId" title="Workspace" defaultValue="">
        <Form.Dropdown.Item value="" title="Default" />
        {workspaces.map((workspace) => (
          <Form.Dropdown.Item key={workspace.id} value={String(workspace.id)} title={workspace.name} />
        ))}
      </Form.Dropdown>
    ) : null;

  return (
    <Form
      isLoading={isSubmitting || isLoadingWorkspaces}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Push" onSubmit={handleSubmit} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="kind" title="Kind" value={pushKind} onChange={(value) => setPushKind(value as PushKind)}>
        <Form.Dropdown.Item value="text" title="Text" icon={Icon.Text} />
        <Form.Dropdown.Item value="url" title="URL" icon={Icon.Link} />
        <Form.Dropdown.Item value="qr" title="QR Code" icon={Icon.Code} />
        <Form.Dropdown.Item value="file" title="File" icon={Icon.Document} />
      </Form.Dropdown>

      {pushKind !== "file" && (
        <Form.TextArea id="payload" title="Payload" placeholder="Secret text, URL, or QR code content" />
      )}
      {pushKind === "file" && <Form.FilePicker id="files" title="Files" allowMultipleSelection={true} />}

      <Form.Separator />

      <Form.TextField id="name" title="Name" placeholder="Optional name for the push" />
      <Form.TextField id="note" title="Note" placeholder="Internal note (creator only)" />

      <Form.Separator />

      <Form.Dropdown
        id="expireAfterDuration"
        title="Expire After Duration"
        defaultValue={String(DEFAULT_EXPIRE_DURATION)}
      >
        {Object.entries(DURATION_LABELS).map(([value, label]) => (
          <Form.Dropdown.Item key={value} value={value} title={label} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="expireAfterViews" title="Expire After Views" defaultValue={String(DEFAULT_EXPIRE_VIEWS)} />

      <Form.TextField id="passphrase" title="Passphrase" placeholder="Optional passphrase required to view" />

      <Form.Checkbox id="deletableByViewer" label="Deletable by Viewer" defaultValue={false} />
      <Form.Checkbox id="retrievalStep" label="Require Retrieval Step" defaultValue={false} />

      {workspaceDropdown}
    </Form>
  );
}

const ONBOARDING_MARKDOWN = `## Welcome to PwPush

Create secure, expiring secret links with PwPush.

### Getting started

- **Public service**: leave the Server URL empty to use the Password Pusher Pro EU service.
- **Self-hosted**: set your server URL in the extension preferences.
- **Account / workspaces**: add your API key in preferences to see your workspaces and keep pushes associated with your account.

All generated links are copied to the clipboard and stored in the local Push History command.
`;

function PushResultView({ record }: { record: PushRecord }) {
  const { pop } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const markdown = `### Push created

The secret link has been copied to your clipboard.

| Field | Value |
| --- | --- |
| Name | ${record.name || "Unnamed"} |
| Kind | ${record.kind} |
| Views left | ${record.viewsRemaining ?? "unknown"} |
| Expires | ${record.expiresAt ? new Date(record.expiresAt).toLocaleString() : "unknown"} |

\`\`\`
${record.url}
\`\`\`
`;

  async function expire() {
    if (!serverUrlsMatch(record.serverUrl, preferences)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Server URL mismatch",
        message: "Set the extension Server URL to match this push before expiring it remotely.",
      });
      return;
    }

    try {
      const apiKey = resolveApiKeyForRecord(record.serverUrl, preferences);
      await expirePush(record.serverUrl, apiKey, record.urlToken);
      await removeFromHistory(record.urlToken, record.serverUrl);
      await showToast({ style: Toast.Style.Success, title: "Push expired" });
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to expire push" });
    }
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy URL"
            icon={Icon.Clipboard}
            onAction={() => Clipboard.copy(record.url, { concealed: true })}
          />
          <Action title="Open in Browser" icon={Icon.Globe} onAction={() => open(record.url)} />
          <Action title="Expire Push" icon={Icon.Trash} onAction={expire} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
