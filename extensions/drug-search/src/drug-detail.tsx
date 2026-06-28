import { Detail, ActionPanel, Action } from "@raycast/api";
import { Result } from "./interfaces";

interface DrugDetailProps {
  drug: Result;
}

export function DrugDetail({ drug }: DrugDetailProps) {
  const brandName = drug.products[0]?.brand_name || "Unknown";
  const genericName = drug.openfda?.generic_name?.[0] || "N/A";
  const dosageForm = drug.products[0]?.dosage_form || "N/A";
  const route = drug.products[0]?.route || "N/A";
  const marketingStatus = drug.products[0]?.marketing_status || "N/A";
  const sponsor = drug.sponsor_name || "N/A";

  // Build markdown content
  let markdown = `# ${brandName}\n\n`;

  markdown += `## Basic Information\n`;
  markdown += `- **Application Number:** ${drug.application_number}\n`;
  markdown += `- **Product Number:** ${drug.products[0]?.product_number || "N/A"}\n`;
  markdown += `- **Sponsor:** ${sponsor}\n\n`;

  markdown += `## Drug Details\n`;
  markdown += `- **Generic Name:** ${genericName}\n`;
  markdown += `- **Dosage Form:** ${dosageForm}\n`;
  markdown += `- **Route of Administration:** ${route}\n`;
  markdown += `- **Marketing Status:** ${marketingStatus}\n`;
  markdown += `- **Reference Drug:** ${drug.products[0]?.reference_drug === "Yes" ? "Yes ✓" : "No"}\n`;
  markdown += `- **Reference Standard:** ${drug.products[0]?.reference_standard === "Yes" ? "Yes ✓" : "No"}\n\n`;

  // Active Ingredients
  if (drug.products[0]?.active_ingredients && drug.products[0].active_ingredients.length > 0) {
    markdown += `## Active Ingredients\n`;
    drug.products[0].active_ingredients.forEach((ingredient) => {
      markdown += `- **${ingredient.name}** - ${ingredient.strength}\n`;
    });
    markdown += "\n";
  }

  // OpenFDA Fields
  if (drug.openfda) {
    markdown += `## FDA Data\n`;
    if (drug.openfda.brand_name && drug.openfda.brand_name.length > 0) {
      markdown += `- **Brand Names:** ${drug.openfda.brand_name.join(", ")}\n`;
    }
    if (drug.openfda.manufacturer_name && drug.openfda.manufacturer_name.length > 0) {
      markdown += `- **Manufacturers:** ${drug.openfda.manufacturer_name.join(", ")}\n`;
    }
    if (drug.openfda.product_type && drug.openfda.product_type.length > 0) {
      markdown += `- **Product Types:** ${drug.openfda.product_type.join(", ")}\n`;
    }
    if (drug.openfda.product_ndc && drug.openfda.product_ndc.length > 0) {
      markdown += `- **Product NDCs:** ${drug.openfda.product_ndc.join(", ")}\n`;
    }
    markdown += "\n";
  }

  // Submissions
  if (drug.submissions && drug.submissions.length > 0) {
    markdown += `## Submissions\n`;
    drug.submissions.forEach((submission, index) => {
      markdown += `### Submission ${index + 1}\n`;
      markdown += `- **Type:** ${submission.submission_type}\n`;
      markdown += `- **Number:** ${submission.submission_number}\n`;
      markdown += `- **Status:** ${submission.submission_status}\n`;
      markdown += `- **Status Date:** ${submission.submission_status_date}\n`;
      if (submission.review_priority) {
        markdown += `- **Review Priority:** ${submission.review_priority}\n`;
      }
      if (submission.submission_class_code) {
        markdown += `- **Class Code:** ${submission.submission_class_code} - ${submission.submission_class_code_description}\n`;
      }
      if (submission.application_docs && submission.application_docs.length > 0) {
        markdown += `- **Documents:**\n`;
        submission.application_docs.forEach((doc) => {
          markdown += `  - [${doc.type}](${doc.url}) (${doc.date})\n`;
        });
      }
      markdown += "\n";
    });
  }

  // FDA Disclaimer
  markdown += `---\n`;
  markdown += `*Data sourced from openFDA. Please refer to official FDA documentation for medical decisions.*\n`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="View on FDA API"
            url={`https://api.fda.gov/drug/drugsfda.json?search=application_number:"${drug.application_number}"`}
          />
          <Action.CopyToClipboard title="Copy Application Number" content={drug.application_number} />
          <Action.CopyToClipboard title="Copy Brand Name" content={brandName} />
          {genericName !== "N/A" && <Action.CopyToClipboard title="Copy Generic Name" content={genericName} />}
        </ActionPanel>
      }
    />
  );
}
