import { Action, ActionPanel, Detail } from "@raycast/api";
import { NifRecord } from "../types";

export default function CompanyDetail({ record }: { record: NifRecord }) {
  const webUrl = record.website;
  const websiteTarget = webUrl ? (webUrl.startsWith("http") ? webUrl : `https://${webUrl}`) : "";
  const caes = record.cae_list || [];

  const markdown = `
# ${record.name || "unknown"}

${record.description || "N/A"}

---

## Contact Information
**Email:** ${record.email || "N/A"}  
**Phone:** ${record.phone || "N/A"}  
**Website:** ${record.website || "N/A"}

## Address
${record.address_full || "N/A"}  
${record.zip_code || ""} ${record.city || ""}

## Structure
**Nature:** ${record.legal_regime || "N/A"}  
**Capital:** ${record.share_capital ? `${record.share_capital} €` : "N/A"}
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="NIF" text={record.nif} />
          <Detail.Metadata.Label title="Status" text={record.is_active ? "Active" : "Inactive"} />
          <Detail.Metadata.Label title="City" text={record.city || "N/A"} />
          <Detail.Metadata.Label title="Start Date" text={record.start_date || "N/A"} />
          {record.website && <Detail.Metadata.Link title="Website" target={websiteTarget} text="Visit Website" />}
          {record.cae_list && record.cae_list.length > 0 && (
            <Detail.Metadata.TagList title="CAE">
              {caes.map((cae) => (
                <Detail.Metadata.TagList.Item key={cae} text={cae} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>{record.website && <Action.OpenInBrowser url={websiteTarget} title="Open Website" />}</ActionPanel>
      }
    />
  );
}
