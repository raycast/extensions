/* eslint-disable @raycast/prefer-title-case */
import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { Package, fetchPackageDetails } from "./pdq-api";
import { DeviceSelector } from "./DeviceSelector";

function formatDescriptionText(text: string): string {
  // Convert download links to Markdown
  let formattedText = text.replace(
    /Download:\s*(https?:\/\/[^\s\n<]+)(?=[\n<]|$)/g,
    (match, url) => `**Download:** [${url}](${url})`,
  );

  // Make specific phrases bold
  const phrasesToBold = [
    "Publisher:",
    "Download:",
    "Supported Operating Systems:",
    "Supported Architecture:",
    "Special Notes:",
    "Custom Settings Applied:",
    "Dependencies:",
  ];

  let isFirstBold = true;
  phrasesToBold.forEach((phrase) => {
    const regex = new RegExp(`(${phrase})`, "g");
    formattedText = formattedText.replace(regex, (match) => {
      if (isFirstBold) {
        isFirstBold = false;
        return `**${match}**`;
      } else {
        return `\n\n**${match}**`;
      }
    });
  });

  return formattedText;
}

export function PackageDetails({ packageId }: { packageId: string }) {
  const [packageDetail, setPackageDetail] = useState<Package | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPackageDetail() {
      try {
        setIsLoading(true);
        setError(null);
        const detail = await fetchPackageDetails(packageId);
        if (detail) {
          setPackageDetail(detail);
        } else {
          setError("Failed to load package details");
        }
      } catch (err) {
        console.error("Failed to fetch package details:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    loadPackageDetail();
  }, [packageId]);

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (error) {
    return <Detail markdown={`# Error\n\n${error}`} />;
  }

  if (!packageDetail) {
    return <Detail markdown="# No Data\n\nNo package details found." />;
  }

  const description = packageDetail.packageVersions?.[0]?.description || "No description available.";

  const markdown = `
# ${packageDetail.name}

## Description

${formatDescriptionText(description)}
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Latest Version" text={packageDetail.latestVersion} />
          <Detail.Metadata.Label title="ID" text={packageDetail.id} />
          <Detail.Metadata.Label title="Latest Version ID" text={packageDetail.latestPackageVersionId} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Package ID" content={packageDetail.id} />
          <Action.CopyToClipboard title="Copy Package Name" content={packageDetail.name} />
          <Action.Push
            title="Deploy to Device"
            target={<DeviceSelector packageId={packageDetail.id} onDeploymentCreated={() => {}} />}
            icon={Icon.Devices}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
        </ActionPanel>
      }
    />
  );
}
