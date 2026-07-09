import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { Companies } from "../api/resources";
import type { Company } from "../api/types";
import { showKyoError } from "../lib/helpers";

export function EditCompanyForm({
  company,
  onSaved,
}: {
  company: Company;
  onSaved?: () => void;
}) {
  const { pop } = useNavigation();

  async function submit(values: {
    name: string;
    website: string;
    industry: string;
    size: string;
    linkedin: string;
    twitter: string;
    instagram: string;
    notes: string;
  }) {
    try {
      // PATCH semantics: null CLEARS a field, undefined leaves it untouched.
      await Companies.update(company.id, {
        name: values.name.trim(),
        website: values.website || null,
        industry: values.industry || null,
        size: values.size || null,
        linkedin: values.linkedin || null,
        twitter: values.twitter || null,
        instagram: values.instagram || null,
        notes: values.notes || null,
      });
      await showToast({ style: Toast.Style.Success, title: "Company updated" });
      onSaved?.();
      pop();
    } catch (error) {
      await showKyoError(error, "Failed to update company");
    }
  }

  return (
    <Form
      navigationTitle={`Edit · ${company.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={company.name} />
      <Form.TextField
        id="website"
        title="Website"
        defaultValue={company.website ?? ""}
      />
      <Form.TextField
        id="industry"
        title="Industry"
        defaultValue={company.industry ?? ""}
      />
      <Form.TextField
        id="size"
        title="Size"
        defaultValue={company.size ?? ""}
      />
      <Form.Separator />
      <Form.TextField
        id="linkedin"
        title="LinkedIn"
        defaultValue={company.linkedin ?? ""}
      />
      <Form.TextField
        id="twitter"
        title="Twitter"
        defaultValue={company.twitter ?? ""}
      />
      <Form.TextField
        id="instagram"
        title="Instagram"
        defaultValue={company.instagram ?? ""}
      />
      <Form.TextArea
        id="notes"
        title="Notes"
        defaultValue={company.notes ?? ""}
      />
    </Form>
  );
}
