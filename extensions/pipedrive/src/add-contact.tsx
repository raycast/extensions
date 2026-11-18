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
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import AddOrganization from "./add-organization";
import {
  buildPipedriveApiUrl,
  buildPipedriveWebUrl,
  fetchPipedriveJson,
  isAbortError,
  type PipedrivePreferences,
} from "./pipedrive-client";
import { redactPipedriveSecrets } from "./pipedrive-security";

interface Organization {
  id: number;
  name: string;
}

interface EmailEntry {
  value: string;
  label: string;
}

interface PhoneEntry {
  value: string;
  label: string;
}

interface ContactFormValues {
  name: string;
  organizationId: string;
  jobTitle: string;
}

interface AddContactProps {
  prefillName?: string;
  prefillOrganizationId?: string;
  prefillOrganizationName?: string;
  onCreated?: (person: { id: string; name: string }) => void;
  personIdToEdit?: string;
  onSaved?: () => void;
}

const ORG_CACHE_TTL_MS = 10 * 60 * 1000;

const CREATE_ORGANIZATION_VALUE = "__create_organization__";

let cachedOrganizations: { data: Organization[]; fetchedAt: number } | undefined;

async function searchPeople(
  preferences: PipedrivePreferences,
  term: string,
  signal?: AbortSignal,
): Promise<Array<{ id: string; title: string }>> {
  const url = buildPipedriveApiUrl(preferences, "/api/v2/itemSearch", {
    term,
    item_types: "person",
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

async function fetchOrganizations(preferences: PipedrivePreferences, signal?: AbortSignal): Promise<Organization[]> {
  if (cachedOrganizations && Date.now() - cachedOrganizations.fetchedAt < ORG_CACHE_TTL_MS) {
    return cachedOrganizations.data;
  }

  const url = buildPipedriveApiUrl(preferences, "/api/v1/organizations", {
    limit: "500",
    sort: "name ASC",
  });

  const data = await fetchPipedriveJson<{ data?: Organization[] | null }>(preferences, url, { signal });
  const organizations = data.data || [];
  cachedOrganizations = { data: organizations, fetchedAt: Date.now() };
  return organizations;
}

export default function AddContact({
  prefillName,
  prefillOrganizationId,
  prefillOrganizationName,
  onCreated,
  personIdToEdit,
  onSaved,
}: AddContactProps = {}) {
  const { pop, push } = useNavigation();
  const preferences = getPreferenceValues<Preferences.AddContact>();

  const isEditing = Boolean(personIdToEdit);

  const personAbortable = useRef<AbortController | null>(null);
  const { data: existingPerson, isLoading: isLoadingPerson } = useCachedPromise(
    async (personId: string) => {
      if (!personId) return null;

      const url = buildPipedriveApiUrl(preferences, `/api/v1/persons/${personId}`);

      const json = await fetchPipedriveJson<{
        data?: {
          id: number;
          name?: string;
          job_title?: string;
          org_id?: number | { value?: number | null; name?: string } | null;
          org_name?: string;
          email?: Array<{ value?: string; label?: string }>;
          phone?: Array<{ value?: string; label?: string }>;
        };
      }>(preferences, url, { method: "get", signal: personAbortable.current?.signal });

      const data = json.data;
      if (!data?.id) return null;

      const rawOrg = data.org_id;
      const orgId = typeof rawOrg === "number" ? rawOrg : rawOrg?.value;
      const orgName = typeof rawOrg === "object" ? rawOrg?.name : data.org_name;

      return {
        id: String(data.id),
        name: (data.name || "").trim(),
        jobTitle: (data.job_title || "").trim(),
        organizationId: orgId ? String(orgId) : "",
        organizationName: (orgName || "").trim(),
        emails:
          (data.email || [])
            .map((e) => ({ value: (e.value || "").trim(), label: (e.label || "work").trim() }))
            .filter((e) => e.value.length > 0) || [],
        phones:
          (data.phone || [])
            .map((p) => ({ value: (p.value || "").trim(), label: (p.label || "work").trim() }))
            .filter((p) => p.value.length > 0) || [],
      };
    },
    [personIdToEdit || ""],
    {
      abortable: personAbortable,
      execute: Boolean(personIdToEdit),
      onError: (error) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        void showToast({
          style: Toast.Style.Failure,
          title: "Failed to load contact",
          message: redactPipedriveSecrets(message, preferences.apiToken),
        });
      },
    },
  );

  const orgAbortable = useRef<AbortController | null>(null);
  const { data: organizations = [], isLoading: isLoadingOrgs } = useCachedPromise(
    async () => {
      return await fetchOrganizations(preferences, orgAbortable.current?.signal);
    },
    [],
    {
      abortable: orgAbortable,
      keepPreviousData: true,
      initialData: cachedOrganizations?.data ?? [],
      onError: (error) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        void showToast({
          style: Toast.Style.Failure,
          title: "Failed to load organizations",
          message: redactPipedriveSecrets(error instanceof Error ? error.message : String(error), preferences.apiToken),
        });
      },
    },
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameValue, setNameValue] = useState(prefillName || "");
  const [organizationSearchText, setOrganizationSearchText] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(prefillOrganizationId || "");
  const [createdOrganizations, setCreatedOrganizations] = useState<Organization[]>([]);
  const [emails, setEmails] = useState<EmailEntry[]>([{ value: "", label: "work" }]);
  const [phones, setPhones] = useState<PhoneEntry[]>([{ value: "", label: "work" }]);

  const submitAbortable = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => submitAbortable.current?.abort();
  }, []);
  const [jobTitleValue, setJobTitleValue] = useState("");

  const didPrefillOrganizationOption = useRef(false);
  useEffect(() => {
    if (didPrefillOrganizationOption.current) return;

    const idRaw = (prefillOrganizationId || "").trim();
    const nameRaw = (prefillOrganizationName || "").trim();
    if (!idRaw || !nameRaw) return;

    const id = Number.parseInt(idRaw, 10);
    if (Number.isNaN(id)) return;

    didPrefillOrganizationOption.current = true;

    const org: Organization = { id, name: nameRaw };
    setCreatedOrganizations((prev) => {
      const without = prev.filter((x) => x.id !== org.id);
      return [org, ...without];
    });

    const existing = cachedOrganizations?.data ?? [];
    if (!existing.some((x) => x.id === org.id)) {
      const next = [...existing, org].sort((a, b) => a.name.localeCompare(b.name));
      cachedOrganizations = { data: next, fetchedAt: Date.now() };
    }
  }, [prefillOrganizationId, prefillOrganizationName]);

  const lastHydratedPersonId = useRef<string | null>(null);
  useEffect(() => {
    if (!existingPerson) return;

    const shouldHydrate =
      lastHydratedPersonId.current !== existingPerson.id ||
      (isEditing && nameValue.trim().length === 0 && existingPerson.name.trim().length > 0);

    if (!shouldHydrate) {
      return;
    }

    lastHydratedPersonId.current = existingPerson.id;

    setNameValue(existingPerson.name);
    setSelectedOrganizationId(existingPerson.organizationId);
    if (existingPerson.organizationId && existingPerson.organizationName) {
      const id = Number.parseInt(existingPerson.organizationId, 10);
      if (!Number.isNaN(id)) {
        const org: Organization = { id, name: existingPerson.organizationName };
        setCreatedOrganizations((prev) => {
          const without = prev.filter((x) => x.id !== org.id);
          return [org, ...without];
        });
      }
    }
    setJobTitleValue(existingPerson.jobTitle);
    setEmails(existingPerson.emails.length > 0 ? existingPerson.emails : [{ value: "", label: "work" }]);
    setPhones(existingPerson.phones.length > 0 ? existingPerson.phones : [{ value: "", label: "work" }]);
  }, [existingPerson, isEditing, nameValue]);

  const mergedOrganizations = useMemo(() => {
    const merged: Organization[] = [];

    for (const org of createdOrganizations) {
      if (!merged.some((x) => x.id === org.id)) {
        merged.push(org);
      }
    }

    for (const org of organizations) {
      if (!merged.some((x) => x.id === org.id)) {
        merged.push(org);
      }
    }

    return merged;
  }, [createdOrganizations, organizations]);

  const canCreateOrganization = useMemo(() => {
    const term = organizationSearchText.trim();
    if (term.length < 2) return false;
    return !mergedOrganizations.some((org) => org.name.trim().toLowerCase() === term.toLowerCase());
  }, [mergedOrganizations, organizationSearchText]);

  const filteredOrganizations = useMemo(() => {
    const term = organizationSearchText.trim().toLowerCase();
    if (!term) {
      return mergedOrganizations;
    }

    return mergedOrganizations.filter((org) => org.name.trim().toLowerCase().includes(term));
  }, [mergedOrganizations, organizationSearchText]);

  useEffect(() => {
    const term = organizationSearchText.trim();
    if (term.length < 1) {
      return;
    }

    const isAutoSelectable = selectedOrganizationId === "" || selectedOrganizationId === CREATE_ORGANIZATION_VALUE;
    if (!isAutoSelectable) {
      return;
    }

    const firstMatch = filteredOrganizations[0];
    if (firstMatch) {
      const nextId = String(firstMatch.id);
      if (nextId !== selectedOrganizationId) {
        setSelectedOrganizationId(nextId);
      }
      return;
    }
  }, [canCreateOrganization, filteredOrganizations, organizationSearchText, selectedOrganizationId]);

  const emailTypes = [
    { value: "work", label: "Work" },
    { value: "home", label: "Home" },
    { value: "other", label: "Other" },
  ];

  const phoneTypes = [
    { value: "work", label: "Work" },
    { value: "mobile", label: "Mobile" },
    { value: "home", label: "Home" },
    { value: "other", label: "Other" },
  ];

  function addEmail() {
    setEmails((prevEmails: EmailEntry[]) => {
      const last = prevEmails[prevEmails.length - 1];
      if (last && !last.value.trim()) {
        return prevEmails;
      }
      return [...prevEmails, { value: "", label: "work" }];
    });
  }

  function updateEmail(index: number, field: keyof EmailEntry, value: string) {
    setEmails((prevEmails: EmailEntry[]) => {
      const updated = [...prevEmails];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function addPhone() {
    setPhones((prev: PhoneEntry[]) => {
      const last = prev[prev.length - 1];
      if (last && !last.value.trim()) {
        return prev;
      }
      return [...prev, { value: "", label: "work" }];
    });
  }

  function updatePhone(index: number, field: keyof PhoneEntry, value: string) {
    setPhones((prev: PhoneEntry[]) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleSubmit(values: ContactFormValues) {
    const name = (values.name || "").trim();
    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }

    if (isSubmitting) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: isEditing ? "Updating contact…" : "Creating contact…",
    });

    try {
      setIsSubmitting(true);

      submitAbortable.current?.abort();
      submitAbortable.current = new AbortController();
      const signal = submitAbortable.current.signal;

      if (!isEditing) {
        const duplicates = await searchPeople(preferences, name, signal);
        if (duplicates.length > 0) {
          const sample = duplicates
            .slice(0, 3)
            .map((d) => d.title)
            .join("\n");
          const ok = await confirmAlert({
            title: "Possible duplicate contacts",
            message: `Found ${duplicates.length} existing contact(s) with a similar name.\n\n${sample}\n\nCreate anyway?`,
          });
          if (!ok) {
            await toast.hide();
            return;
          }
        }
      }

      const url = buildPipedriveApiUrl(
        preferences,
        isEditing && personIdToEdit ? `/api/v1/persons/${personIdToEdit}` : "/api/v1/persons",
      );

      const body: Record<string, unknown> = {
        name,
      };

      const validEmails = emails.filter((email) => email.value.trim());
      if (validEmails.length > 0) {
        body.email = validEmails.map((email, index) => ({
          value: email.value.trim(),
          label: email.label,
          primary: index === 0,
        }));
      }

      const validPhones = phones.filter((phone) => phone.value.trim());
      if (validPhones.length > 0) {
        body.phone = validPhones.map((phone, index) => ({
          value: phone.value.trim(),
          label: phone.label,
          primary: index === 0,
        }));
      }

      const jobTitle = (values.jobTitle || "").trim();
      if (jobTitle) {
        body.job_title = jobTitle;
      }

      const orgId = (values.organizationId || "").trim();
      if (orgId) {
        const parsedOrgId = Number.parseInt(orgId, 10);
        if (Number.isNaN(parsedOrgId)) {
          await toast.hide();
          await showToast({ style: Toast.Style.Failure, title: "Selected organization is invalid" });
          return;
        }
        body.org_id = parsedOrgId;
      }

      const result = await fetchPipedriveJson<{ data?: { id: number; name: string } }>(preferences, url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!isEditing && result.data?.id && result.data?.name) {
        onCreated?.({ id: String(result.data.id), name: result.data.name });
      }

      const personUrl = result.data?.id
        ? buildPipedriveWebUrl(preferences.domain, `/person/${result.data.id}`)
        : undefined;

      toast.style = Toast.Style.Success;
      toast.title = isEditing ? "Contact updated" : "Contact created";
      toast.message = result.data?.name
        ? result.data.name
        : isEditing
          ? "Contact has been updated"
          : "Contact has been created";
      toast.primaryAction = personUrl
        ? {
            title: "Open in Browser",
            onAction: () => open(personUrl),
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
      toast.title = isEditing ? "Failed to update contact" : "Failed to create contact";
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
      isLoading={isLoadingOrgs || isLoadingPerson || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Update Contact" : "Add Contact"}
            onSubmit={handleSubmit}
            icon="👤"
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <ActionPanel.Section>
            <Action
              title="Add Another Email"
              icon="➕"
              onAction={addEmail}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "e" },
                Windows: { modifiers: ["ctrl"], key: "e" },
              }}
            />
            <Action
              title="Add Another Phone"
              icon="➕"
              onAction={addPhone}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "p" },
                Windows: { modifiers: ["ctrl"], key: "p" },
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter contact name"
        info="Full name of the contact (required)"
        value={nameValue}
        onChange={setNameValue}
      />

      <Form.Dropdown
        id="organizationId"
        title="Organization"
        placeholder="Type to search organizations"
        info="Choose an existing organization or leave blank"
        isLoading={isLoadingOrgs}
        value={selectedOrganizationId}
        onChange={(newValue) => {
          if (newValue === CREATE_ORGANIZATION_VALUE) {
            const name = organizationSearchText.trim();
            if (!name) {
              return;
            }

            push(
              <AddOrganization
                prefillName={name}
                onCreated={(org) => {
                  const id = Number.parseInt(org.id, 10);
                  if (!Number.isNaN(id)) {
                    const created: Organization = { id, name: org.name };

                    setCreatedOrganizations((prev) => {
                      const without = prev.filter((x) => x.id !== created.id);
                      return [created, ...without];
                    });

                    const existing = cachedOrganizations?.data ?? [];
                    if (!existing.some((x) => x.id === created.id)) {
                      const next = [...existing, created].sort((a, b) => a.name.localeCompare(b.name));
                      cachedOrganizations = { data: next, fetchedAt: Date.now() };
                    }
                  }

                  setSelectedOrganizationId(org.id);
                }}
              />,
            );

            return;
          }

          setSelectedOrganizationId(newValue);
        }}
        onSearchTextChange={setOrganizationSearchText}
      >
        {organizationSearchText.trim().length === 0 || filteredOrganizations.length === 0 ? (
          <Form.Dropdown.Item value="" title="No Organization" />
        ) : null}
        {filteredOrganizations.map((org: Organization) => (
          <Form.Dropdown.Item key={org.id} value={org.id.toString()} title={org.name} />
        ))}
        {canCreateOrganization ? (
          <Form.Dropdown.Item
            value={CREATE_ORGANIZATION_VALUE}
            title={`Create Organization "${organizationSearchText.trim()}"`}
          />
        ) : null}
      </Form.Dropdown>

      <Form.TextField
        id="jobTitle"
        title="Job Title"
        placeholder="Enter job title"
        info="Contact's job title or position"
        value={jobTitleValue}
        onChange={setJobTitleValue}
      />

      <Form.Separator />

      {emails.map((email: EmailEntry, index: number) => (
        <Fragment key={`email-${index}`}>
          <Form.TextField
            id={`email-${index}`}
            title={index === 0 ? "Email" : `Email ${index + 1}`}
            placeholder="Enter email address"
            value={email.value}
            onChange={(value: string) => updateEmail(index, "value", value)}
          />
          <Form.Dropdown
            id={`email-type-${index}`}
            title={index === 0 ? "Email Type" : `Email ${index + 1} Type`}
            value={email.label}
            onChange={(value: string) => updateEmail(index, "label", value)}
          >
            {emailTypes.map((type) => (
              <Form.Dropdown.Item key={type.value} value={type.value} title={type.label} />
            ))}
          </Form.Dropdown>
        </Fragment>
      ))}

      <Form.Description title="Add Email" text={`Add Another Email (Cmd+Shift+E / Ctrl+Shift+E).`} />

      <Form.Separator />

      {phones.map((phone: PhoneEntry, index: number) => (
        <Fragment key={`phone-${index}`}>
          <Form.TextField
            id={`phone-${index}`}
            title={index === 0 ? "Phone" : `Phone ${index + 1}`}
            placeholder="Enter phone number"
            value={phone.value}
            onChange={(value: string) => updatePhone(index, "value", value)}
          />
          <Form.Dropdown
            id={`phone-type-${index}`}
            title={index === 0 ? "Phone Type" : `Phone ${index + 1} Type`}
            value={phone.label}
            onChange={(value: string) => updatePhone(index, "label", value)}
          >
            {phoneTypes.map((type) => (
              <Form.Dropdown.Item key={type.value} value={type.value} title={type.label} />
            ))}
          </Form.Dropdown>
        </Fragment>
      ))}

      <Form.Description title="Add Phones" text={`Add Another Phone (Cmd+Shift+P / Ctrl+Shift+P).`} />

      <Form.Separator />
    </Form>
  );
}
