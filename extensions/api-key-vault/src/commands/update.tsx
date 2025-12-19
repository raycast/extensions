import {
  Action,
  ActionPanel,
  Form,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import {
  formatTagsForText,
  normalizeKeyName,
  normalizeKeyNameForTyping,
  parseTagsFromText,
  validateKeyName,
  VaultRecordMetadata,
} from "../lib/model";
import { findMatches } from "../lib/search";
import { keyNameExists, listRecords, updateRecordById } from "../lib/storage";

function UpdateForm(props: {
  record: VaultRecordMetadata;
  onUpdated: () => void;
}) {
  const { pop } = useNavigation();
  const MASKED_API_KEY = "********";
  const [draft, setDraft] = useState<{
    id: string;
    keyName: string; // typing value
    application: string;
    service: string;
    tagsText: string;
  }>({
    id: props.record.id,
    keyName: props.record.keyName,
    application: props.record.application,
    service: props.record.service,
    tagsText: formatTagsForText(props.record.tags),
  });

  const [apiKeyValue, setApiKeyValue] = useState<string>(MASKED_API_KEY);
  const [apiKeyDirty, setApiKeyDirty] = useState(false);

  const [keyNameTouched, setKeyNameTouched] = useState(false);

  useEffect(() => {
    // Never reveal the existing secret in the UI.
    // Keep a masked placeholder and only store a new key if the user types one.
    setApiKeyValue(MASKED_API_KEY);
    setApiKeyDirty(false);
  }, [props.record.id]);

  const draftKeyNameDisplay = useMemo(
    () => normalizeKeyNameForTyping(draft.keyName),
    [draft.keyName],
  );
  const draftKeyNameFinal = useMemo(
    () => normalizeKeyName(draftKeyNameDisplay),
    [draftKeyNameDisplay],
  );
  const keyNameError = useMemo(() => {
    if (!keyNameTouched) return undefined;
    return validateKeyName(draftKeyNameFinal);
  }, [draftKeyNameFinal, keyNameTouched]);

  const canCheckDuplicate = useMemo(
    () => validateKeyName(draftKeyNameDisplay) === undefined,
    [draftKeyNameDisplay],
  );

  const { data: isDuplicate } = useCachedPromise(
    async (k: string, excludeId?: string) => {
      if (!k) return false;
      if (validateKeyName(k)) return false;
      return await keyNameExists(k, { excludeId });
    },
    [canCheckDuplicate ? draftKeyNameDisplay : "", draft.id],
    { keepPreviousData: true },
  );

  const duplicateError = isDuplicate ? "Key name already exists" : undefined;
  const combinedKeyNameError = keyNameError ?? duplicateError;

  async function onSubmit(values: {
    application: string;
    service: string;
    apiKey: string;
    tags: string;
  }) {
    try {
      const shouldUpdateApiKey =
        apiKeyDirty &&
        apiKeyValue.trim().length > 0 &&
        apiKeyValue !== MASKED_API_KEY;

      const updated = await updateRecordById(draft.id, {
        keyName: draftKeyNameFinal,
        application: values.application,
        service: values.service,
        tags: parseTagsFromText(values.tags),
        ...(shouldUpdateApiKey ? { apiKey: apiKeyValue } : {}),
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Updated",
        message: updated.keyName,
      });
      props.onUpdated();
      pop();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await showToast({
        style: Toast.Style.Failure,
        title: "Update failed",
        message,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="keyName"
        title="Key Name"
        value={draftKeyNameDisplay}
        onChange={(v) =>
          setDraft((d) => ({ ...d, keyName: normalizeKeyNameForTyping(v) }))
        }
        onBlur={() => setKeyNameTouched(true)}
        error={combinedKeyNameError}
        info="Globally unique; auto-formatted to kebab-case."
      />
      <Form.TextField
        id="application"
        title="Application"
        defaultValue={draft.application}
      />
      <Form.TextField
        id="service"
        title="Service Name"
        defaultValue={draft.service}
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        value={apiKeyValue}
        info="Leave unchanged to keep the current key. Click to replace."
        onFocus={() => {
          if (!apiKeyDirty && apiKeyValue === MASKED_API_KEY) {
            setApiKeyValue("");
          }
        }}
        onBlur={() => {
          if (!apiKeyDirty && apiKeyValue.trim() === "") {
            setApiKeyValue(MASKED_API_KEY);
          }

          if (apiKeyDirty && apiKeyValue.trim() === "") {
            // User clicked in, then cleared/left it blank: treat as "no change".
            setApiKeyDirty(false);
            setApiKeyValue(MASKED_API_KEY);
          }
        }}
        onChange={(newValue) => {
          // If the user starts typing while masked, treat it as replacement.
          if (
            !apiKeyDirty &&
            apiKeyValue === MASKED_API_KEY &&
            newValue !== MASKED_API_KEY
          ) {
            setApiKeyDirty(true);
            setApiKeyValue(newValue);
            return;
          }

          // If already dirty, keep the new value.
          if (apiKeyDirty) {
            setApiKeyValue(newValue);
            return;
          }

          // Not dirty yet: allow edits after focus-clears.
          setApiKeyValue(newValue);
          if (newValue.trim().length > 0) setApiKeyDirty(true);
        }}
      />
      <Form.TextField
        id="tags"
        title="Tags"
        defaultValue={draft.tagsText}
        placeholder="comma-separated"
      />
    </Form>
  );
}

export default function UpdateCommand() {
  const [query, setQuery] = useState("");
  const {
    data: records,
    isLoading,
    revalidate,
  } = useCachedPromise(async () => await listRecords(), [], {
    keepPreviousData: true,
  });

  const matches = useMemo(
    () => findMatches(records ?? [], query),
    [records, query],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type to find a key to update (matches name, app, service, tags)"
      onSearchTextChange={setQuery}
      throttle
    >
      {matches.map((m) => (
        <List.Item
          key={m.record.id}
          title={m.record.keyName}
          subtitle={[m.record.application, m.record.service]
            .filter(Boolean)
            .join(" · ")}
          accessories={
            m.record.tags.length
              ? [{ tag: { value: m.record.tags.join(", ") } }]
              : []
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit"
                target={<UpdateForm record={m.record} onUpdated={revalidate} />}
              />
              <Action title="Refresh" onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
