import { Color, Icon, List } from "@raycast/api";
import { categoryLabel, type RaycastEntry } from "./feed";
import { type RaycastJob } from "./jobs-feed";

function formatDate(value?: string) {
  if (!value) return "";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function cleanText(value?: string | null) {
  return String(value || "").trim();
}

function trustLabel(value: RaycastEntry["downloadTrust"]) {
  if (value === "first-party") return "First-party";
  if (value === "external") return "External";
  return "";
}

export function entrySnippetKeyword(entry: RaycastEntry) {
  return `hc-${entry.slug}`.slice(0, 40);
}

export function entryDetailMetadata(entry: RaycastEntry, generatedAt = "") {
  const platforms = Array.isArray(entry.platformCompatibility)
    ? entry.platformCompatibility.filter(Boolean)
    : [];
  const sourceUrl = entry.repoUrl || entry.documentationUrl;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Category"
        text={categoryLabel(entry.category)}
        icon={Icon.Tag}
      />
      {entry.brandName ? (
        <List.Item.Detail.Metadata.Label
          title="Brand"
          text={entry.brandName}
          icon={Icon.Building}
        />
      ) : null}
      {entry.brandDomain ? (
        <List.Item.Detail.Metadata.Label
          title="Domain"
          text={entry.brandDomain}
          icon={Icon.Globe}
        />
      ) : null}
      {entry.brandAssetSource ? (
        <List.Item.Detail.Metadata.Label
          title="Brand icon"
          text={entry.brandAssetSource}
          icon={Icon.Image}
        />
      ) : null}
      {entry.brandVerifiedAt ? (
        <List.Item.Detail.Metadata.Label
          title="Brand verified"
          text={formatDate(entry.brandVerifiedAt)}
          icon={Icon.CheckCircle}
        />
      ) : null}
      {entry.author ? (
        <List.Item.Detail.Metadata.Label
          title="Author"
          text={entry.author}
          icon={Icon.Person}
        />
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      {trustLabel(entry.downloadTrust) ? (
        <List.Item.Detail.Metadata.Label
          title="Download trust"
          text={trustLabel(entry.downloadTrust)}
          icon={Icon.Shield}
        />
      ) : null}
      {entry.verificationStatus ? (
        <List.Item.Detail.Metadata.Label
          title="Verification"
          text={entry.verificationStatus}
          icon={Icon.CheckRosette}
        />
      ) : null}
      {entry.copyTextTruncated ? (
        <List.Item.Detail.Metadata.Label
          title="Copy payload"
          text="Loaded on demand"
          icon={Icon.Download}
        />
      ) : null}
      {generatedAt ? (
        <List.Item.Detail.Metadata.Label
          title="Feed updated"
          text={formatDate(generatedAt)}
          icon={Icon.Clock}
        />
      ) : null}
      {platforms.length ? (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Platforms">
            {platforms.slice(0, 8).map((platform) => (
              <List.Item.Detail.Metadata.TagList.Item
                key={platform}
                text={platform}
                color={Color.Blue}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </>
      ) : null}
      {entry.tags.length ? (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Tags">
            {entry.tags.slice(0, 10).map((tag) => (
              <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </>
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Link
        title="HeyClaude listing"
        target={entry.webUrl}
        text="Open canonical page"
      />
      {entry.documentationUrl ? (
        <List.Item.Detail.Metadata.Link
          title="Documentation"
          target={entry.documentationUrl}
          text="Open docs"
        />
      ) : null}
      {sourceUrl ? (
        <List.Item.Detail.Metadata.Link
          title="Source"
          target={sourceUrl}
          text={entry.repoUrl ? "Open repository" : "Open source"}
        />
      ) : null}
    </List.Item.Detail.Metadata>
  );
}

export function jobDetailMetadata(job: RaycastJob, generatedAt = "") {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Company"
        text={job.company}
        icon={Icon.Building}
      />
      <List.Item.Detail.Metadata.Label
        title="Location"
        text={job.location}
        icon={Icon.Pin}
      />
      {job.type ? (
        <List.Item.Detail.Metadata.Label
          title="Type"
          text={job.type}
          icon={Icon.Clock}
        />
      ) : null}
      {job.compensation ? (
        <List.Item.Detail.Metadata.Label
          title="Compensation"
          text={job.compensation}
          icon={Icon.Coins}
        />
      ) : null}
      {job.equity ? (
        <List.Item.Detail.Metadata.Label
          title="Equity"
          text={job.equity}
          icon={Icon.BarChart}
        />
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Source"
        text={job.sourceLabel}
        icon={Icon.Shield}
      />
      <List.Item.Detail.Metadata.Label
        title="Apply path"
        text={job.applySourceLabel}
        icon={Icon.ArrowRight}
      />
      {job.lastVerifiedAt ? (
        <List.Item.Detail.Metadata.Label
          title="Last verified"
          text={formatDate(job.lastVerifiedAt)}
          icon={Icon.CheckCircle}
        />
      ) : null}
      {generatedAt ? (
        <List.Item.Detail.Metadata.Label
          title="Jobs updated"
          text={formatDate(generatedAt)}
          icon={Icon.Clock}
        />
      ) : null}
      {job.benefits?.length ? (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Benefits">
            {job.benefits.slice(0, 8).map((benefit) => (
              <List.Item.Detail.Metadata.TagList.Item
                key={benefit}
                text={benefit}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </>
      ) : null}
      {job.labels?.length ? (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Labels">
            {job.labels.slice(0, 8).map((label) => (
              <List.Item.Detail.Metadata.TagList.Item
                key={label}
                text={label}
                color={label === "Featured" ? Color.Blue : undefined}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </>
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Link
        title="Employer apply"
        target={job.applyUrl}
        text="Open application"
      />
      <List.Item.Detail.Metadata.Link
        title="HeyClaude listing"
        target={job.webUrl}
        text="Open job page"
      />
      {cleanText(job.companyUrl) ? (
        <List.Item.Detail.Metadata.Link
          title="Company site"
          target={job.companyUrl || ""}
          text="Open company"
        />
      ) : null}
      {cleanText(job.sourceUrl) ? (
        <List.Item.Detail.Metadata.Link
          title="Source listing"
          target={job.sourceUrl || ""}
          text="Open original listing"
        />
      ) : null}
    </List.Item.Detail.Metadata>
  );
}
