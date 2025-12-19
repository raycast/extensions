import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import {
  normalizeKeyName,
  normalizeKeyNameForTyping,
  parseTagsFromText,
  validateKeyName,
} from "../lib/model";
import { createRecord, keyNameExists } from "../lib/storage";

export default function CreateCommand() {
  const { pop } = useNavigation();

  const [keyNameRaw, setKeyNameRaw] = useState("");
  const [application, setApplication] = useState("");
  const [service, setService] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [tagsText, setTagsText] = useState("");

  const [keyNameTouched, setKeyNameTouched] = useState(false);
  const [applicationTouched, setApplicationTouched] = useState(false);
  const [serviceTouched, setServiceTouched] = useState(false);
  const [apiKeyTouched, setApiKeyTouched] = useState(false);
  const keyNameDisplay = useMemo(
    () => normalizeKeyNameForTyping(keyNameRaw),
    [keyNameRaw],
  );
  const keyNameFinal = useMemo(
    () => normalizeKeyName(keyNameDisplay),
    [keyNameDisplay],
  );
  const keyNameError = useMemo(() => {
    if (!keyNameTouched) return undefined;
    return validateKeyName(keyNameFinal);
  }, [keyNameFinal, keyNameTouched]);

  const canCheckDuplicate = useMemo(
    () => validateKeyName(keyNameDisplay) === undefined,
    [keyNameDisplay],
  );

  const {
    data: isDuplicate,
    isLoading: isDupLoading,
    revalidate: revalidateDup,
  } = useCachedPromise(
    async (k: string) => {
      if (!k) return false;
      if (validateKeyName(k)) return false;
      return await keyNameExists(k);
    },
    [canCheckDuplicate ? keyNameDisplay : ""],
    { keepPreviousData: true },
  );

  useEffect(() => {
    void revalidateDup();
  }, [keyNameDisplay, canCheckDuplicate]);

  const duplicateError = isDuplicate ? "Key name already exists" : undefined;
  const combinedKeyNameError = keyNameError ?? duplicateError;

  const canSubmit =
    !combinedKeyNameError &&
    !isDupLoading &&
    application.trim().length > 0 &&
    service.trim().length > 0 &&
    apiKey.length > 0;

  async function onSubmit() {
    try {
      const record = await createRecord({
        keyName: keyNameFinal,
        application,
        service,
        apiKey,
        tags: parseTagsFromText(tagsText),
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Created",
        message: record.keyName,
      });
      pop();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await showToast({
        style: Toast.Style.Failure,
        title: "Create failed",
        message,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="keyName"
        title="Key Name"
        placeholder="e.g. openai-prod"
        value={keyNameDisplay}
        onChange={(v) => setKeyNameRaw(normalizeKeyNameForTyping(v))}
        onBlur={() => setKeyNameTouched(true)}
        info="Auto-formatted to kebab-case. Hyphens allowed. Must be globally unique."
        error={combinedKeyNameError}
      />
      <Form.TextField
        id="application"
        title="Application"
        placeholder="e.g. my-backend"
        value={application}
        onChange={setApplication}
        onBlur={() => setApplicationTouched(true)}
        error={
          applicationTouched && !application.trim()
            ? "Application is required"
            : undefined
        }
      />
      <Form.TextField
        id="service"
        title="Service Name"
        placeholder="e.g. OpenAI, Anthropic, OpenRouter"
        value={service}
        onChange={setService}
        onBlur={() => setServiceTouched(true)}
        error={
          serviceTouched && !service.trim()
            ? "Service name is required"
            : undefined
        }
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        value={apiKey}
        onChange={setApiKey}
        onBlur={() => setApiKeyTouched(true)}
        error={apiKeyTouched && !apiKey ? "API key is required" : undefined}
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="comma-separated (e.g. prod, billing, openai)"
        value={tagsText}
        onChange={setTagsText}
      />

      <Form.Description
        title="Ready"
        text={
          canSubmit
            ? "Press ⌘↩ to create"
            : "Fix validation errors to enable create"
        }
      />
    </Form>
  );
}
