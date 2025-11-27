import { Action, ActionPanel, Detail } from "@raycast/api";
import { NifRecord } from "../types";

export default function CompanyDetail({ record }: { record: NifRecord }) {
  const webUrl = record.contactChannels?.webUrl;
  const websiteTarget = webUrl ? (webUrl.startsWith("http") ? webUrl : `https://${webUrl}`) : "";
  const caes = record.apiMetadata?.caeList ? `${record.apiMetadata.caeList}`.split(",").map((cae) => cae.trim()) : [];

  const markdown = `
# ${record.companyName || "unknown"}

${record.activityDescription || "N/A"}

---

## Contact Information
**Email:** ${record.contactChannels?.primaryEmail || "N/A"}  
**Phone:** ${record.contactChannels?.primaryPhone || "N/A"}  
**Website:** ${record.contactChannels?.webUrl || "N/A"}  
**Fax:** ${record.contactChannels?.fax || "N/A"}

## Address
${record.headquartersLocation?.addressLine || "N/A"}  
${record.headquartersLocation?.zipCodePart4 || ""}-${record.headquartersLocation?.zipCodePart3 || ""} ${record.headquartersLocation?.city || ""}

## Structure
**Nature:** ${record.apiMetadata?.legalRegime || "N/A"}  
**Capital:** ${record.apiMetadata?.shareCapital || "N/A"}
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="NIF" text={`${record.taxId}`} />
          <Detail.Metadata.Label title="Status" text={record.registrationStatus || "N/A"} />
          <Detail.Metadata.Label title="City" text={record.headquartersLocation?.city || "N/A"} />
          <Detail.Metadata.Label title="Start Date" text={record.startDate || "N/A"} />
          {record.contactChannels?.webUrl && (
            <Detail.Metadata.Link title="Website" target={websiteTarget} text="Visit Website" />
          )}
          {record.apiMetadata?.caeList && (
            <Detail.Metadata.TagList title="CAE">
              {caes.map((cae) => (
                <Detail.Metadata.TagList.Item key={cae.trim()} text={cae.trim()} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {record.contactChannels?.webUrl && <Action.OpenInBrowser url={websiteTarget} title="Open Website" />}
        </ActionPanel>
      }
    />
  );
}
