import {
  Action,
  ActionPanel,
  Form,
  confirmAlert,
  getPreferenceValues,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";

import {
  buildPipedriveApiUrl,
  buildPipedriveWebUrl,
  fetchPipedriveJson,
  isAbortError,
  type PipedrivePreferences,
} from "./pipedrive-client";
import { redactPipedriveSecrets } from "./pipedrive-security";

interface AddOrganizationProps {
  prefillName?: string;
  onCreated?: (organization: { id: string; name: string }) => void;
  organizationIdToEdit?: string;
  onSaved?: () => void;
}

async function searchOrganizations(
  preferences: PipedrivePreferences,
  term: string,
  signal?: AbortSignal,
): Promise<Array<{ id: string; title: string }>> {
  const url = buildPipedriveApiUrl(preferences, "/api/v2/itemSearch", {
    term,
    item_types: "organization",
    limit: "10",
  });

  const json = await fetchPipedriveJson<{ data?: { items?: Array<{ item?: { id?: number; name?: string } }> } }>(
    preferences,
    url,
    { method: "get", signal },
  );
  const items = json.data?.items || [];

  return items
    .map((w) => {
      const id = w.item?.id;
      const title = (w.item?.name || "").trim();
      if (!id || !title) {
        return null;
      }
      return { id: String(id), title };
    })
    .filter((x): x is { id: string; title: string } => Boolean(x));
}

export default function AddOrganization({
  prefillName,
  onCreated,
  organizationIdToEdit,
  onSaved,
}: AddOrganizationProps = {}) {
  const { pop } = useNavigation();
  const preferences = getPreferenceValues<Preferences.Index>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameValue, setNameValue] = useState(prefillName || "");

  const isEditing = Boolean(organizationIdToEdit);

  const orgAbortable = useRef<AbortController | null>(null);
  const { data: existingOrganization, isLoading: isLoadingOrganization } = useCachedPromise(
    async (organizationId: string) => {
      if (!organizationId) return null;

      const url = buildPipedriveApiUrl(preferences, `/api/v1/organizations/${organizationId}`);

      const json = await fetchPipedriveJson<{ data?: unknown }>(preferences, url, {
        method: "get",
        signal: orgAbortable.current?.signal,
      });

      const anyJson = json as { data?: unknown };
      const rawData = anyJson.data;
      const entity =
        rawData && typeof rawData === "object" && "data" in (rawData as Record<string, unknown>)
          ? ((rawData as Record<string, unknown>).data as unknown)
          : rawData;

      if (!entity || typeof entity !== "object") return null;
      const entityObj = entity as Record<string, unknown>;
      const id = entityObj.id;
      const name = entityObj.name;
      if ((typeof id !== "number" && typeof id !== "string") || typeof name !== "string") {
        return null;
      }

      return { id: String(id), name };
    },
    [organizationIdToEdit || ""],
    {
      abortable: orgAbortable,
      execute: Boolean(organizationIdToEdit),
      onError: (error) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        void showToast({
          style: Toast.Style.Failure,
          title: "Failed to load organization",
          message: redactPipedriveSecrets(message, preferences.apiToken),
        });
      },
    },
  );

  const submitAbortable = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => submitAbortable.current?.abort();
  }, []);

  const lastHydratedOrganizationId = useRef<string | null>(null);
  useEffect(() => {
    if (!organizationIdToEdit) {
      setNameValue(prefillName || "");
    }
  }, [organizationIdToEdit, prefillName]);

  const didWarnMissingOrganization = useRef(false);
  useEffect(() => {
    didWarnMissingOrganization.current = false;
  }, [organizationIdToEdit]);

  useEffect(() => {
    if (!organizationIdToEdit) return;
    if (isLoadingOrganization) return;
    if (existingOrganization) return;
    if (didWarnMissingOrganization.current) return;

    didWarnMissingOrganization.current = true;
    void showToast({
      style: Toast.Style.Failure,
      title: "Organization not found",
      message: "Could not load the organization details for editing.",
    });
  }, [existingOrganization, isLoadingOrganization, organizationIdToEdit]);

  useEffect(() => {
    if (!existingOrganization) return;

    const shouldHydrate =
      lastHydratedOrganizationId.current !== existingOrganization.id ||
      (isEditing && nameValue.trim().length === 0 && existingOrganization.name.trim().length > 0);

    if (!shouldHydrate) {
      return;
    }

    lastHydratedOrganizationId.current = existingOrganization.id;
    setNameValue((existingOrganization.name || "").trim());
  }, [existingOrganization, isEditing, nameValue]);

  async function handleSubmit(values: { name: string; note?: string }) {
    const name = (values.name || "").trim();
    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "Organization name is required" });
      return;
    }

    if (isSubmitting) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: isEditing ? "Updating organization…" : "Creating organization…",
    });

    try {
      setIsSubmitting(true);

      submitAbortable.current?.abort();
      submitAbortable.current = new AbortController();
      const signal = submitAbortable.current.signal;

      const note = (values.note || "").trim();

      if (isEditing && organizationIdToEdit) {
        const updateBody: Record<string, unknown> = { name };

        const updateUrl = buildPipedriveApiUrl(preferences, `/api/v1/organizations/${organizationIdToEdit}`);
        await fetchPipedriveJson<Record<string, unknown>>(preferences, updateUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateBody),
          signal,
        });

        if (note) {
          const noteUrl = buildPipedriveApiUrl(preferences, "/api/v1/notes");
          await fetchPipedriveJson<Record<string, unknown>>(preferences, noteUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: note, org_id: Number.parseInt(organizationIdToEdit, 10) }),
            signal,
          });
        }

        const orgUrl = buildPipedriveWebUrl(preferences.domain, `/organization/${organizationIdToEdit}`);
        toast.style = Toast.Style.Success;
        toast.title = "Organization updated";
        toast.message = name;
        toast.primaryAction = {
          title: "Open in Browser",
          onAction: () => open(orgUrl),
        };

        onSaved?.();
        pop();
        return;
      }

      const duplicates = await searchOrganizations(preferences, name, signal);
      if (duplicates.length > 0) {
        const sample = duplicates
          .slice(0, 3)
          .map((d) => d.title)
          .join("\n");
        const ok = await confirmAlert({
          title: "Possible duplicate organizations",
          message: `Found ${duplicates.length} existing organization(s) with a similar name.\n\n${sample}\n\nCreate anyway?`,
        });
        if (!ok) {
          await toast.hide();
          return;
        }
      }

      const url = buildPipedriveApiUrl(preferences, "/api/v1/organizations");

      const body: Record<string, unknown> = { name };
      if (note) {
        body.note = note;
      }

      const result = await fetchPipedriveJson<{ data?: { id: number; name: string } }>(preferences, url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });

      if (result.data?.id && result.data?.name) {
        onCreated?.({ id: String(result.data.id), name: result.data.name });
      }

      const orgUrl = result.data?.id
        ? buildPipedriveWebUrl(preferences.domain, `/organization/${result.data.id}`)
        : undefined;

      toast.style = Toast.Style.Success;
      toast.title = "Organization created";
      toast.message = result.data?.name ? result.data.name : "Organization has been created";
      toast.primaryAction = orgUrl
        ? {
            title: "Open in Browser",
            onAction: () => open(orgUrl),
          }
        : undefined;

      onSaved?.();
      pop();
    } catch (error) {
      if (isAbortError(error)) {
        await toast.hide();
        return;
      }

      toast.style = Toast.Style.Failure;
      toast.title = isEditing ? "Failed to update organization" : "Failed to create organization";
      toast.message = redactPipedriveSecrets(
        error instanceof Error ? error.message : String(error),
        preferences.apiToken,
      );
    } finally {
      setIsSubmitting(false);
      submitAbortable.current = null;
    }
  }

  return (
    <Form
      isLoading={isSubmitting || isLoadingOrganization}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Update Organization" : "Add Organization"}
            onSubmit={handleSubmit}
            icon="🏢"
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Organization Name"
        placeholder="Enter organization name"
        value={nameValue}
        onChange={setNameValue}
      />
      <Form.TextArea id="note" title="Note" placeholder="Optional note" />
    </Form>
  );
}
