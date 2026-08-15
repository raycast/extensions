import { ActionPanel, Action, Detail, Icon } from "@raycast/api";
import { formatFileSize, formatDate } from "../types";
import { getFileViewUrl } from "../utils";
import type { RazunaFile } from "../types";

interface FileDetailProps {
  file: RazunaFile;
}

export default function FileDetail({ file }: FileDetailProps) {
  // Use timestamp_display for better formatted dates, fallback to other date fields
  const displayDate =
    file.timestamp_display || formatDate(file.audit_info?.created_date || file.created_at || "Unknown");

  const fileViewUrl = getFileViewUrl(file);

  // Build AI-detected content sections
  const buildAISection = () => {
    const sections = [];

    if (file.objects && file.objects.length > 0) {
      sections.push(`**Objects Detected:** ${file.objects.join(", ")}`);
    }

    if (file.people && file.people.length > 0) {
      const peopleInfo = file.people
        .map(
          (person) =>
            `${person.gender} (${person.age_range}), ${person.ethnicity}, ${person.hair_color} hair, ${person.eye_color} eyes`,
        )
        .join("; ");
      sections.push(`**People Detected:** ${peopleInfo}`);
    }

    if (file.people_gender && file.people_gender.length > 0) {
      sections.push(`**Gender:** ${file.people_gender.join(", ")}`);
    }

    if (file.people_age_range && file.people_age_range.length > 0) {
      sections.push(`**Age Range:** ${file.people_age_range.join(", ")}`);
    }

    if (file.people_ethnicity && file.people_ethnicity.length > 0) {
      sections.push(`**Ethnicity:** ${file.people_ethnicity.join(", ")}`);
    }

    return sections.length > 0 ? `\n\n## 🤖 AI Analysis\n\n${sections.join("\n\n")}` : "";
  };

  const buildTagsSection = () => {
    const sections = [];

    if (file.keywords && file.keywords.length > 0) {
      sections.push(`**Keywords:** ${file.keywords.join(", ")}`);
    }

    if (file.labels_names && file.labels_names.length > 0) {
      sections.push(`**Tags:** ${file.labels_names.join(", ")}`);
    }

    return sections.length > 0 ? `\n\n## 🏷️ Tags & Keywords\n\n${sections.join("\n\n")}` : "";
  };

  // Get the best available filename
  const fileName = file.name || file.file_name || file.original_name || "Untitled";

  // Get the best available thumbnail (400x400 should be url_tl)
  const thumbnailUrl =
    file.direct_links?.url_tl ||
    file.urls?.url_tl ||
    file.direct_links?.url_t ||
    file.urls?.url_t ||
    file.direct_links?.url ||
    file.urls?.url;

  const markdown = `
${thumbnailUrl ? `![${fileName}](${thumbnailUrl})` : ""}

# ${fileName}

${file.description ? `*${file.description}*\n` : ""}## 📄 File Information

**Filename:** ${file.original_name || file.file_name}
**File Size:** ${file.size_human || formatFileSize(file.size)}
**File Type:** ${file.content_type}
**Extension:** ${file.extension.toUpperCase()}
${file.pixels ? `**Dimensions:** ${file.pixels}` : ""}
**Date:** ${displayDate}
${file.checksum ? `**Checksum:** \`${file.checksum}\`` : ""}

${buildTagsSection()}

${buildAISection()}
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="File Name" text={fileName} />
          <Detail.Metadata.Label title="Size" text={file.size_human || formatFileSize(file.size)} />
          {file.pixels && <Detail.Metadata.Label title="Dimensions" text={file.pixels} />}
          <Detail.Metadata.Label title="Type" text={file.content_type} />
          <Detail.Metadata.Label title="Extension" text={file.extension.toUpperCase()} />

          {file.keywords && file.keywords.length > 0 && (
            <Detail.Metadata.TagList title="Keywords">
              {file.keywords.map((keyword, index) => (
                <Detail.Metadata.TagList.Item key={index} text={keyword} />
              ))}
            </Detail.Metadata.TagList>
          )}

          {file.labels_names && file.labels_names.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {file.labels_names.map((tag, index) => (
                <Detail.Metadata.TagList.Item key={index} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          )}

          {file.objects && file.objects.length > 0 && (
            <Detail.Metadata.TagList title="Objects">
              {file.objects.map((object, index) => (
                <Detail.Metadata.TagList.Item key={index} text={object} />
              ))}
            </Detail.Metadata.TagList>
          )}

          {file.people_gender && file.people_gender.length > 0 && (
            <Detail.Metadata.TagList title="People">
              {file.people_gender.map((gender, index) => (
                <Detail.Metadata.TagList.Item key={index} text={gender} />
              ))}
            </Detail.Metadata.TagList>
          )}

          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Date" text={displayDate} />
          {file.checksum && <Detail.Metadata.Label title="Checksum" text={file.checksum} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {fileViewUrl && <Action.OpenInBrowser title="Open in Browser" url={fileViewUrl} icon={Icon.Globe} />}
          {(file.direct_links?.url_dl || file.urls?.url_dl) && (
            <Action.OpenInBrowser
              title="Download File"
              url={file.direct_links?.url_dl || file.urls?.url_dl || ""}
              icon={Icon.Download}
            />
          )}
          {(file.direct_links?.url_tl || file.urls?.url_tl) && (
            <Action.OpenInBrowser
              title="View Large Thumbnail"
              url={file.direct_links?.url_tl || file.urls?.url_tl || ""}
              icon={Icon.Image}
            />
          )}
          <Action.CopyToClipboard title="Copy File Name" content={file.name} icon={Icon.Clipboard} />
          <Action.CopyToClipboard title="Copy File ID" content={file._id} icon={Icon.Clipboard} />
          {(file.direct_links?.url || file.urls?.url) && (
            <Action.CopyToClipboard
              title="Copy File URL"
              content={file.direct_links?.url || file.urls?.url || ""}
              icon={Icon.Link}
            />
          )}
          {file.pixels && <Action.CopyToClipboard title="Copy Dimensions" content={file.pixels} icon={Icon.Ruler} />}
        </ActionPanel>
      }
    />
  );
}
