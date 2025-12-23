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
import { useEffect, useMemo, useRef, useState } from "react";

import AddContact from "./add-contact";
import AddOrganization from "./add-organization";
import {
  buildPipedriveApiUrl,
  buildPipedriveWebUrl,
  fetchPipedriveJson,
  isAbortError,
  type PipedrivePreferences,
} from "./pipedrive-client";
import { redactPipedriveSecrets } from "./pipedrive-security";

interface ItemSearchResponse {
  data?: {
    items?: Array<{
      item?: {
        id?: number;
        type?: string;
        title?: string;
        name?: string;
        organization?: { name?: string };
      };
    }>;
  };
}

interface DealResponse {
  data?: {
    id: number;
    title?: string;
  };
  error?: string;
  error_info?: string;
}

interface AddDealProps {
  prefillTitle?: string;
  prefillPersonId?: string;
  prefillPersonName?: string;
  prefillOrganizationId?: string;
  prefillOrganizationName?: string;
  dealIdToEdit?: string;
  onSaved?: () => void;
}

const CREATE_PERSON_VALUE = "__create_person__";
const CREATE_ORGANIZATION_VALUE = "__create_organization__";

async function itemSearch(
  term: string,
  itemTypes: string,
  preferences: PipedrivePreferences,
  signal?: AbortSignal,
): Promise<Array<{ id: string; title: string }>> {
  const url = buildPipedriveApiUrl(preferences, "/api/v2/itemSearch", {
    term,
    item_types: itemTypes,
    limit: "10",
  });

  const json = await fetchPipedriveJson<ItemSearchResponse>(preferences, url, { method: "get", signal });
  const items = json.data?.items || [];

  return items
    .map((wrap) => {
      const item = wrap.item;
      const id = item?.id;
      const title = (item?.title || item?.name || "").trim();
      if (!id || !title) {
        return null;
      }
      return { id: String(id), title };
    })
    .filter((x): x is { id: string; title: string } => Boolean(x));
}

export default function AddDeal({
  prefillTitle,
  prefillPersonId,
  prefillPersonName,
  prefillOrganizationId,
  prefillOrganizationName,
  dealIdToEdit,
  onSaved,
}: AddDealProps = {}) {
  const { pop, push } = useNavigation();
  const preferences = getPreferenceValues<Preferences.AddDeal>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(dealIdToEdit);

  const [titleValue, setTitleValue] = useState(prefillTitle || "");
  const [valueValue, setValueValue] = useState("");

  const [selectedPersonId, setSelectedPersonId] = useState(prefillPersonId || "");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(prefillOrganizationId || "");
  const [createdPeople, setCreatedPeople] = useState<Array<{ id: string; title: string }>>([]);
  const [createdOrganizations, setCreatedOrganizations] = useState<Array<{ id: string; title: string }>>([]);

  const [editPersonOption, setEditPersonOption] = useState<{ id: string; title: string } | null>(null);
  const [editOrganizationOption, setEditOrganizationOption] = useState<{ id: string; title: string } | null>(null);

  const [personSearchText, setPersonSearchText] = useState("");
  const [organizationSearchText, setOrganizationSearchText] = useState("");

  const submitAbortable = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => submitAbortable.current?.abort();
  }, []);

  const dealAbortable = useRef<AbortController | null>(null);
  const { data: existingDeal, isLoading: isLoadingDeal } = useCachedPromise(
    async (dealId: string) => {
      if (!dealId) return null;

      const url = buildPipedriveApiUrl(preferences, `/api/v1/deals/${dealId}`);

      const json = await fetchPipedriveJson<{
        data?: {
          id: number;
          title?: string;
          value?: number | string | null;
          person_id?: { value?: number | null; name?: string } | number | null;
          org_id?: { value?: number | null; name?: string } | number | null;
          person_name?: string;
          org_name?: string;
        };
      }>(preferences, url, { method: "get", signal: dealAbortable.current?.signal });

      const data = json.data;
      if (!data?.id) return null;

      const rawPerson = data.person_id;
      const personId = typeof rawPerson === "number" ? rawPerson : rawPerson?.value;
      const personName = typeof rawPerson === "object" ? rawPerson?.name : data.person_name;

      const rawOrg = data.org_id;
      const orgId = typeof rawOrg === "number" ? rawOrg : rawOrg?.value;
      const orgName = typeof rawOrg === "object" ? rawOrg?.name : data.org_name;

      return {
        id: String(data.id),
        title: (data.title || "").trim(),
        value: data.value == null ? "" : String(data.value),
        personId: personId ? String(personId) : "",
        personName: (personName || "").trim(),
        organizationId: orgId ? String(orgId) : "",
        organizationName: (orgName || "").trim(),
      };
    },
    [dealIdToEdit || ""],
    {
      abortable: dealAbortable,
      execute: Boolean(dealIdToEdit),
      onError: (error) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        void showToast({
          style: Toast.Style.Failure,
          title: "Failed to load deal",
          message: redactPipedriveSecrets(message, preferences.apiToken),
        });
      },
    },
  );

  const lastHydratedDealId = useRef<string | null>(null);
  useEffect(() => {
    if (!existingDeal) return;

    const shouldHydrate =
      lastHydratedDealId.current !== existingDeal.id ||
      (isEditing && titleValue.trim().length === 0 && existingDeal.title.trim().length > 0);

    if (!shouldHydrate) {
      return;
    }

    lastHydratedDealId.current = existingDeal.id;

    setTitleValue(existingDeal.title);
    setValueValue(existingDeal.value);

    setSelectedPersonId(existingDeal.personId);
    setSelectedOrganizationId(existingDeal.organizationId);

    if (existingDeal.personId && existingDeal.personName) {
      setEditPersonOption({ id: existingDeal.personId, title: existingDeal.personName });
    }
    if (existingDeal.organizationId && existingDeal.organizationName) {
      setEditOrganizationOption({ id: existingDeal.organizationId, title: existingDeal.organizationName });
    }
  }, [existingDeal, isEditing, titleValue]);

  const personAbortable = useRef<AbortController | null>(null);
  const orgAbortable = useRef<AbortController | null>(null);

  const { data: personOptions = [], isLoading: isLoadingPeople } = useCachedPromise(
    async (searchText: string) => {
      const term = searchText.trim();
      if (term.length < 2) {
        return [];
      }
      return await itemSearch(term, "person", preferences, personAbortable.current?.signal);
    },
    [personSearchText],
    {
      abortable: personAbortable,
      keepPreviousData: true,
      execute: true,
      onError: (error) => {
        if (error.name === "AbortError") return;
        void showToast({
          style: Toast.Style.Failure,
          title: "Failed to search people",
          message: redactPipedriveSecrets(error.message, preferences.apiToken),
        });
      },
    },
  );

  const { data: organizationOptions = [], isLoading: isLoadingOrganizations } = useCachedPromise(
    async (searchText: string) => {
      const term = searchText.trim();
      if (term.length < 2) {
        return [];
      }
      return await itemSearch(term, "organization", preferences, orgAbortable.current?.signal);
    },
    [organizationSearchText],
    {
      abortable: orgAbortable,
      keepPreviousData: true,
      execute: true,
      onError: (error) => {
        if (error.name === "AbortError") return;
        void showToast({
          style: Toast.Style.Failure,
          title: "Failed to search organizations",
          message: redactPipedriveSecrets(error.message, preferences.apiToken),
        });
      },
    },
  );

  const prefilledPersonItem = useMemo(() => {
    if (!prefillPersonId || !prefillPersonName) return null;
    return { id: prefillPersonId, title: prefillPersonName };
  }, [prefillPersonId, prefillPersonName]);

  const prefilledOrgItem = useMemo(() => {
    if (!prefillOrganizationId || !prefillOrganizationName) return null;
    return { id: prefillOrganizationId, title: prefillOrganizationName };
  }, [prefillOrganizationId, prefillOrganizationName]);

  async function handleSubmit(values: { title: string; value?: string; personId?: string; organizationId?: string }) {
    const title = (values.title || "").trim();
    if (!title) {
      await showToast({ style: Toast.Style.Failure, title: "Deal title is required" });
      return;
    }

    if (isSubmitting) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: isEditing ? "Updating deal…" : "Creating deal…",
    });

    try {
      setIsSubmitting(true);

      submitAbortable.current?.abort();
      submitAbortable.current = new AbortController();
      const signal = submitAbortable.current.signal;

      if (!isEditing) {
        const duplicates = await itemSearch(title, "deal", preferences, signal);
        if (duplicates.length > 0) {
          const sample = duplicates
            .slice(0, 3)
            .map((d) => d.title)
            .join("\n");
          const ok = await confirmAlert({
            title: "Possible duplicate deals",
            message: `Found ${duplicates.length} existing deal(s) with a similar title.\n\n${sample}\n\nCreate anyway?`,
          });
          if (!ok) {
            await toast.hide();
            return;
          }
        }
      }

      const url = buildPipedriveApiUrl(
        preferences,
        isEditing && dealIdToEdit ? `/api/v1/deals/${dealIdToEdit}` : "/api/v1/deals",
      );

      const body: Record<string, unknown> = { title };

      const rawValue = (values.value || "").trim();
      if (rawValue) {
        const parsed = Number(rawValue);
        if (!Number.isNaN(parsed)) {
          body.value = parsed;
        }
      }

      const personId = (values.personId || "").trim();
      if (personId) {
        body.person_id = Number.parseInt(personId, 10);
      }

      const orgId = (values.organizationId || "").trim();
      if (orgId) {
        body.org_id = Number.parseInt(orgId, 10);
      }

      const result = await fetchPipedriveJson<DealResponse>(preferences, url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      const dealId = result.data?.id;
      const dealTitle = result.data?.title || title;
      const dealUrl = dealId ? buildPipedriveWebUrl(preferences.domain, `/deal/${dealId}`) : undefined;

      toast.style = Toast.Style.Success;
      toast.title = isEditing ? "Deal updated" : "Deal created";
      toast.message = dealTitle;
      toast.primaryAction = dealUrl
        ? {
            title: "Open in Browser",
            onAction: () => open(dealUrl),
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
      toast.title = isEditing ? "Failed to update deal" : "Failed to create deal";
      toast.message = redactPipedriveSecrets(
        error instanceof Error ? error.message : String(error),
        preferences.apiToken,
      );
    } finally {
      setIsSubmitting(false);
      submitAbortable.current = null;
    }
  }

  const mergedPersonOptions = useMemo(() => {
    const merged: Array<{ id: string; title: string }> = [];
    if (prefilledPersonItem) {
      merged.push(prefilledPersonItem);
    }
    if (editPersonOption) {
      merged.push(editPersonOption);
    }
    for (const p of createdPeople) {
      if (!merged.some((x) => x.id === p.id)) {
        merged.push(p);
      }
    }
    for (const p of personOptions) {
      if (!merged.some((x) => x.id === p.id)) {
        merged.push(p);
      }
    }
    return merged;
  }, [createdPeople, editPersonOption, personOptions, prefilledPersonItem]);

  const mergedOrganizationOptions = useMemo(() => {
    const merged: Array<{ id: string; title: string }> = [];
    if (prefilledOrgItem) {
      merged.push(prefilledOrgItem);
    }
    if (editOrganizationOption) {
      merged.push(editOrganizationOption);
    }
    for (const o of createdOrganizations) {
      if (!merged.some((x) => x.id === o.id)) {
        merged.push(o);
      }
    }
    for (const o of organizationOptions) {
      if (!merged.some((x) => x.id === o.id)) {
        merged.push(o);
      }
    }
    return merged;
  }, [createdOrganizations, editOrganizationOption, organizationOptions, prefilledOrgItem]);

  const canCreatePerson = useMemo(() => {
    const term = personSearchText.trim();
    if (term.length < 2) return false;
    return !mergedPersonOptions.some((p) => p.title.trim().toLowerCase() === term.toLowerCase());
  }, [mergedPersonOptions, personSearchText]);

  const canCreateOrganization = useMemo(() => {
    const term = organizationSearchText.trim();
    if (term.length < 2) return false;
    return !mergedOrganizationOptions.some((o) => o.title.trim().toLowerCase() === term.toLowerCase());
  }, [mergedOrganizationOptions, organizationSearchText]);

  useEffect(() => {
    const term = personSearchText.trim();
    if (term.length < 1) {
      return;
    }

    const isAutoSelectable = selectedPersonId === "" || selectedPersonId === CREATE_PERSON_VALUE;
    if (!isAutoSelectable) {
      return;
    }

    const firstMatch = personOptions[0];
    if (firstMatch) {
      if (firstMatch.id !== selectedPersonId) {
        setSelectedPersonId(firstMatch.id);
      }
      return;
    }
  }, [canCreatePerson, personOptions, personSearchText, selectedPersonId]);

  useEffect(() => {
    const term = organizationSearchText.trim();
    if (term.length < 1) {
      return;
    }

    const isAutoSelectable = selectedOrganizationId === "" || selectedOrganizationId === CREATE_ORGANIZATION_VALUE;
    if (!isAutoSelectable) {
      return;
    }

    const firstMatch = organizationOptions[0];
    if (firstMatch) {
      if (firstMatch.id !== selectedOrganizationId) {
        setSelectedOrganizationId(firstMatch.id);
      }
      return;
    }
  }, [canCreateOrganization, organizationOptions, organizationSearchText, selectedOrganizationId]);

  return (
    <Form
      isLoading={isSubmitting || isLoadingDeal}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update Deal" : "Create Deal"} onSubmit={handleSubmit} icon="💰" />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter deal title"
        value={titleValue}
        onChange={setTitleValue}
      />

      <Form.TextField
        id="value"
        title="Value ($)"
        placeholder="Optional (e.g. 100,000)"
        value={valueValue}
        onChange={setValueValue}
      />

      <Form.Separator />
      <Form.Dropdown
        id="personId"
        title="Person"
        placeholder="Type to search people"
        isLoading={isLoadingPeople}
        value={selectedPersonId}
        onChange={(newValue) => {
          if (newValue === CREATE_PERSON_VALUE) {
            const name = personSearchText.trim();
            if (!name) return;

            push(
              <AddContact
                prefillName={name}
                prefillOrganizationId={selectedOrganizationId}
                onCreated={(person) => {
                  const created = { id: person.id, title: person.name };
                  setCreatedPeople((prev) => {
                    const without = prev.filter((x) => x.id !== created.id);
                    return [created, ...without];
                  });
                  setSelectedPersonId(person.id);
                }}
              />,
            );
            return;
          }

          setSelectedPersonId(newValue);
        }}
        filtering={false}
        throttle
        onSearchTextChange={setPersonSearchText}
      >
        {personSearchText.trim().length === 0 || mergedPersonOptions.length === 0 ? (
          <Form.Dropdown.Item value="" title="No Person" />
        ) : null}
        {mergedPersonOptions.map((p) => (
          <Form.Dropdown.Item key={p.id} value={p.id} title={p.title} />
        ))}
        {canCreatePerson ? (
          <Form.Dropdown.Item value={CREATE_PERSON_VALUE} title={`Create Contact "${personSearchText.trim()}"`} />
        ) : null}
      </Form.Dropdown>
      <Form.Dropdown
        id="organizationId"
        title="Organization"
        placeholder="Type to search organizations"
        isLoading={isLoadingOrganizations}
        value={selectedOrganizationId}
        onChange={(newValue) => {
          if (newValue === CREATE_ORGANIZATION_VALUE) {
            const name = organizationSearchText.trim();
            if (!name) return;

            push(
              <AddOrganization
                prefillName={name}
                onCreated={(org) => {
                  const created = { id: org.id, title: org.name };
                  setCreatedOrganizations((prev) => {
                    const without = prev.filter((x) => x.id !== created.id);
                    return [created, ...without];
                  });
                  setSelectedOrganizationId(org.id);
                }}
              />,
            );
            return;
          }

          setSelectedOrganizationId(newValue);
        }}
        filtering={false}
        throttle
        onSearchTextChange={setOrganizationSearchText}
      >
        {organizationSearchText.trim().length === 0 || mergedOrganizationOptions.length === 0 ? (
          <Form.Dropdown.Item value="" title="No Organization" />
        ) : null}
        {mergedOrganizationOptions.map((o) => (
          <Form.Dropdown.Item key={o.id} value={o.id} title={o.title} />
        ))}
        {canCreateOrganization ? (
          <Form.Dropdown.Item
            value={CREATE_ORGANIZATION_VALUE}
            title={`Create Organization "${organizationSearchText.trim()}"`}
          />
        ) : null}
      </Form.Dropdown>
    </Form>
  );
}
