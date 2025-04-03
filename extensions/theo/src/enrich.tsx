import { Form, ActionPanel, Action, showHUD, closeMainWindow, getPreferenceValues } from "@raycast/api";
import { createCompany } from "./attio";
import type { Thesis, Source } from "./attio";

interface FormValues {
  domains: string;
  thesis: Thesis;
  source: Source;
}

export default function Command() {
  async function handleSubmit(values: FormValues) {
    await closeMainWindow();
    await showHUD("Creating companies...");

    try {
      // Split domains by newlines, commas, and spaces
      const domains = values.domains
        .split(/[\n,\s]+/) // Split on one or more newlines, commas, or whitespace
        .map((d) => d.trim())
        .filter((d) => d.length > 0);

      // Process each domain
      for (const domain of domains) {
        await showHUD(`Creating company for ${domain}...`);
        await createCompany({
          name: domain.split(".")[0].toUpperCase(), // Use domain name as company name
          domains: [domain],
          owner: [getPreferenceValues().OWNER_EMAIL],
          thesis: values.thesis,
          source: values.source,
        });
      }

      await showHUD(`✅ Created ${domains.length} companies`);
    } catch (error) {
      await showHUD(`❌ Failed to create companies: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="domains"
        title="Domains"
        placeholder="Enter domain(s) (separated by spaces, commas, or new lines)..."
      />
      <Form.Dropdown id="thesis" title="Thesis">
        <Form.Dropdown.Item value="modern" title="Modern" />
        <Form.Dropdown.Item value="genai" title="GenAI" />
        <Form.Dropdown.Item value="web3" title="Web3" />
        <Form.Dropdown.Item value="other" title="Other" />
      </Form.Dropdown>
      <Form.Dropdown id="source" title="Source">
        <Form.Dropdown.Item value="inbound" title="Inbound" />
        <Form.Dropdown.Item value="referral" title="Referral" />
        <Form.Dropdown.Item value="research_automated" title="Research (automated)" />
        <Form.Dropdown.Item value="research_manual" title="Research (manual)" />
        <Form.Dropdown.Item value="legacy" title="Legacy" />
        <Form.Dropdown.Item value="none" title="None" />
      </Form.Dropdown>
    </Form>
  );
}
