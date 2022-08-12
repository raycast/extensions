import { Form, ActionPanel, Action, showToast, Toast, Icon, getPreferenceValues } from "@raycast/api";
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
  const [url, setUrl] = useState("");
  const [domainError, setDomainError] = useState<string | undefined>();

  function dropDomainErrorIfNeeded() {
    if (domainError && domainError.length > 0) {
      setDomainError(undefined);
    }
  }

  async function handleSubmit(values: CommandForm) {
    if (values.domain.length == 0) {
      setDomainError("This field is required!");
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
        toast.title = "Company enrichment data retrieved";

        setUrl(url);
        setOutput(response.data);
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve company enrichment data";
        toast.message = error.response.data.error.message ?? "";
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Enrichment Data" onSubmit={handleSubmit} icon={Icon.Pencil} />
          {url ? (
            <>
              <Action.OpenInBrowser title="Open in Browser" url={url} />
              <Action.CopyToClipboard title="Copy to Clipboard" content={url} />
            </>
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="domain"
        title="Domain"
        placeholder="Enter domain"
        error={domainError}
        onChange={dropDomainErrorIfNeeded}
      />
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
