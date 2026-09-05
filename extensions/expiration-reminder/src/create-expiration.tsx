import { Action, ActionPanel, Form, Icon, Toast, open, popToRoot, showToast } from "@raycast/api";
import { FormValidation, showFailureToast, useForm, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { createExpiration, listCategories, searchContacts } from "./api/endpoints";
import { toApiDate } from "./lib/dates";
import { expirationWebUrl } from "./lib/links";
import { ApiError } from "./lib/errors";
import { track } from "./lib/telemetry";

interface CreateExpirationValues {
  name: string;
  categoryId: string;
  expirationDate: Date | null;
  details: string;
  contactId: string;
}

export function CreateExpirationForm(props: { defaultContactId?: string; defaultContactName?: string }) {
  const [contactQuery, setContactQuery] = useState("");
  const contactAbortable = useRef<AbortController | undefined>(undefined);

  useEffect(() => track({ name: "command_opened", command_name: "create-expiration" }), []);

  // Category dropdown options.
  const { isLoading: categoriesLoading, data: categories } = usePromise(async () => {
    const res = await listCategories();
    return res.categories;
  });

  // Async contact dropdown options.
  const { isLoading: contactsLoading, data: contactResults } = usePromise(
    async (q: string) => {
      if (q.trim().length < 2) return [];
      const res = await searchContacts({
        term: q.trim(),
        paging: 25,
        sort: "name",
        signal: contactAbortable.current?.signal,
      });
      return res.contacts;
    },
    [contactQuery],
    { abortable: contactAbortable },
  );

  // Keep the selected contact selectable even when it isn't in the latest results.
  const contactOptions = useMemo(() => {
    const map = new Map<string, string>();
    if (props.defaultContactId && props.defaultContactName) {
      map.set(props.defaultContactId, props.defaultContactName);
    }
    for (const c of contactResults ?? []) map.set(c.id, `${c.name}${c.email ? ` (${c.email})` : ""}`);
    return Array.from(map.entries());
  }, [contactResults, props.defaultContactId, props.defaultContactName]);

  const { handleSubmit, itemProps, reset } = useForm<CreateExpirationValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating expiration…" });
      try {
        const created = await createExpiration({
          name: values.name.trim(),
          categoryId: values.categoryId || undefined,
          expirationDate: toApiDate(values.expirationDate as Date),
          details: values.details.trim() || undefined,
          contactId: values.contactId || undefined,
        });
        track({
          name: "item_created",
          has_contact: Boolean(values.contactId),
          has_category: Boolean(values.categoryId),
        });

        toast.style = Toast.Style.Success;
        toast.title = "Expiration created";
        toast.message = created.name;
        const url = expirationWebUrl(created.id);
        toast.primaryAction = {
          title: "Open in Web App",
          shortcut: { modifiers: ["cmd"], key: "o" },
          onAction: () => open(url),
        };
        reset({ name: "", categoryId: "", expirationDate: null, details: "", contactId: "" });
        await popToRoot({ clearSearchBar: true });
      } catch (error) {
        if (error instanceof ApiError) {
          track({
            name: "error_occurred",
            command_name: "create-expiration",
            http_status: error.status,
            code: error.code,
          });
        }
        await showFailureToast(error, { title: "Couldn't create expiration" });
      }
    },
    initialValues: {
      name: "",
      categoryId: "",
      expirationDate: null,
      details: "",
      contactId: props.defaultContactId ?? "",
    },
    validation: {
      name: FormValidation.Required,
      expirationDate: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={categoriesLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Expiration" icon={Icon.PlusCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Name" placeholder="e.g. Liability Insurance" />
      <Form.Dropdown {...itemProps.categoryId} title="Category" isLoading={categoriesLoading}>
        <Form.Dropdown.Item value="" title="Generic (default)" />
        {(categories ?? []).map((category) => (
          <Form.Dropdown.Item key={category.id} value={category.id} title={category.name} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker {...itemProps.expirationDate} title="Expiration Date" type={Form.DatePicker.Type.Date} />
      <Form.TextArea {...itemProps.details} title="Details" placeholder="Optional notes" />
      <Form.Dropdown
        {...itemProps.contactId}
        title="Contact"
        isLoading={contactsLoading}
        throttle
        onSearchTextChange={setContactQuery}
      >
        <Form.Dropdown.Item value="" title="No contact" />
        {contactOptions.map(([id, label]) => (
          <Form.Dropdown.Item key={id} value={id} title={label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function CreateExpirationCommand() {
  return <CreateExpirationForm />;
}
