import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues, Clipboard } from "@raycast/api";
import axios from "axios";
import { useState } from "react";

interface Preferences {
  companyEnrichmentApiKey: string;
}

interface CommandForm {
  domain: string;
}

interface EnrichmentItem {
  name: string;
  domain: string;
  country: string;
  locality: string;
  employees_count: string;
  industry: string;
  year_founded: number;
  linkedin_url: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [output, setOutput] = useState({} as EnrichmentItem);

  async function handleSubmit(values: CommandForm) {
    if (values.domain == "") {
      showToast(Toast.Style.Failure, "Error", "Domain is required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving company enrichment...",
    });

    const baseUrl = "https://companyenrichment.abstractapi.com/v1";
    const domain = encodeURIComponent(values.domain);
    const url = `${baseUrl}/?api_key=${preferences.companyEnrichmentApiKey}&domain=${domain}`;

    await axios
      .get(url)
      .then((response) => {
        toast.style = Toast.Style.Success;
        toast.title = "Company enrichment retrieved successfully";
        toast.message = "Hover over the toast to see available actions";
        toast.primaryAction = {
          title: "Open in Browser",
          onAction: (toast) => {
            open(url);

            toast.hide();
          },
        };
        toast.secondaryAction = {
          title: "Copy to Clipboard",
          onAction: async (toast) => {
            await Clipboard.copy(JSON.stringify(response.data));

            toast.title = "Company enrichment output copied to clipboard";
            toast.message = undefined;
          },
        };

        setOutput(response.data);
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve company enrichment";
        toast.message = error.response.data.error.message ?? "";
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Enrichment Data" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField id="domain" title="Domain" placeholder="Enter domain" />
      {output.name ? (
        <>
          <Form.Separator />
          <Form.Description title="Name" text={output.name} />
          <Form.Description title="Domain" text={output.domain} />
          <Form.Description title="Country" text={output.country} />
          <Form.Description title="Locality" text={output.locality} />
          <Form.Description title="Employees Count" text={`${output.employees_count}`} />
          <Form.Description title="Industry" text={output.industry} />
          <Form.Description title="Year Founded" text={`${output.year_founded}`} />
          <Form.Description title="LinkedIn URL" text={output.linkedin_url} />
        </>
      ) : null}
    </Form>
  );
}
