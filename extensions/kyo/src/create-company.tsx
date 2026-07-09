import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { Companies } from "./api/resources";
import { showKyoError } from "./lib/helpers";
import { LogOutAction } from "./components/AuthActions";

interface CompanyFormValues {
  name: string;
  website: string;
  industry: string;
  size: string;
  linkedin: string;
  twitter: string;
  instagram: string;
  notes: string;
}

export default function CreateCompany() {
  const { pop } = useNavigation();

  async function submit(values: CompanyFormValues) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }
    try {
      const company = await Companies.create({
        name: values.name.trim(),
        website: values.website || undefined,
        industry: values.industry || undefined,
        size: values.size || undefined,
        linkedin: values.linkedin || undefined,
        twitter: values.twitter || undefined,
        instagram: values.instagram || undefined,
        notes: values.notes || undefined,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Company created",
        message: company.name,
      });
      pop();
    } catch (error) {
      await showKyoError(error, "Failed to create company");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Company"
            icon={Icon.Plus}
            onSubmit={submit}
          />
          <LogOutAction />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Acme Corp" />
      <Form.TextField
        id="website"
        title="Website"
        placeholder="https://acme.com"
      />
      <Form.TextField id="industry" title="Industry" placeholder="SaaS" />
      <Form.TextField id="size" title="Size" placeholder="11-50" />
      <Form.Separator />
      <Form.TextField
        id="linkedin"
        title="LinkedIn"
        placeholder="https://linkedin.com/company/…"
      />
      <Form.TextField
        id="twitter"
        title="Twitter"
        placeholder="https://x.com/…"
      />
      <Form.TextField
        id="instagram"
        title="Instagram"
        placeholder="https://instagram.com/…"
      />
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Context about this company…"
      />
    </Form>
  );
}
