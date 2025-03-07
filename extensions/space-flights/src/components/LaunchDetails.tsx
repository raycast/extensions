import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { Launch } from "../lib/types";
import { formatLaunchDate, getLaunchStatusIcon } from "../lib/utils";
import { useLaunchDetails, API_BASE_URLS } from "../lib/api";

// No need to redefine API_BASE_URLS here as we're importing it

interface LaunchDetailsProps {
  launch: Launch;
}

const LaunchDetails = ({ launch }: LaunchDetailsProps) => {
  const { name, status, net, window_start, window_end, mission, pad, rocket, image, webcast_live, url } = launch;
  const { pop } = useNavigation();

  // Use the hook to fetch detailed launch information
  const { data: detailedLaunch, isLoading } = url ? useLaunchDetails(url) : { data: null, isLoading: false };

  const launchDate = formatLaunchDate(net);
  const windowStart = formatLaunchDate(window_start);
  const windowEnd = window_end ? formatLaunchDate(window_end) : null;

  // Get the website URL from info_urls if available
  const getWebsiteUrl = (): string | undefined => {
    // Check if any info_urls are available
    if (detailedLaunch?.info_urls && detailedLaunch.info_urls.length > 0) {
      // Find the first URL that is not an API URL
      const validUrl = detailedLaunch.info_urls.find((info) => {
        return !API_BASE_URLS.some((apiUrl) => info.url.startsWith(apiUrl));
      });

      if (validUrl) {
        return validUrl.url;
      }
    }

    // Filter out API URLs from the base url as well
    if (url && !API_BASE_URLS.some((apiUrl) => url.startsWith(apiUrl))) {
      return url;
    }

    // No valid URLs available
    return undefined;
  };

  // Generate program section if available
  const getProgramSection = (): string => {
    if (!detailedLaunch?.program || detailedLaunch.program.length === 0) {
      return "";
    }

    return `## Program
${detailedLaunch.program.map((prog) => `**${prog.name}**: ${prog.description || "No description available."}`).join("\n\n")}
`;
  };

  // Generate updates section if available
  const getUpdatesSection = (): string => {
    if (!detailedLaunch?.updates || detailedLaunch.updates.length === 0) {
      return "";
    }

    return `## Updates
${detailedLaunch.updates.map((update) => `**${new Date(update.created_on).toLocaleString()}**: ${update.comment}`).join("\n\n")}
`;
  };

  // Generate additional links section if available
  const getAdditionalLinksSection = (): string => {
    if (!detailedLaunch?.info_urls || detailedLaunch.info_urls.length === 0) {
      return "";
    }

    return `## Additional Links
${detailedLaunch.info_urls.map((info) => `- [${info.title}](${info.url})${info.description ? `: ${info.description}` : ""}`).join("\n")}
`;
  };

  const markdown = `
# ${name}

${detailedLaunch?.infographic ? `![Launch Infographic](${detailedLaunch.infographic})` : image ? `![Launch Image](${image})` : ""}

## Status
${getLaunchStatusIcon(status)} ${status.name} - ${status.description}

## Schedule
**Launch Date:** ${launchDate}
**Window Start:** ${windowStart}
${windowEnd ? `**Window End:** ${windowEnd}` : ""}

## Mission
${mission?.description || "No mission details available."}

## Rocket
**Name:** ${rocket.configuration.full_name || rocket.configuration.name}
**Family:** ${rocket.configuration.family}

## Location
**Pad:** ${pad.name}
**Location:** ${pad.location.name}, ${pad.location.country_code}

${detailedLaunch?.agency ? `## Agency\n**Name:** ${detailedLaunch.agency.name}\n**Type:** ${detailedLaunch.agency.type}` : ""}

${getProgramSection()}
${getUpdatesSection()}
${getAdditionalLinksSection()}
  `;

  const websiteUrl = getWebsiteUrl();

  return (
    <Detail
      markdown={markdown}
      navigationTitle={name}
      isLoading={isLoading}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Rocket" text={rocket.configuration.name} />
          <Detail.Metadata.Label title="Status" text={`${getLaunchStatusIcon(status)} ${status.name}`} />
          <Detail.Metadata.Label title="Launch Date" text={launchDate} />
          {mission?.name && <Detail.Metadata.Label title="Mission" text={mission.name} />}
          <Detail.Metadata.Label title="Launch Site" text={`${pad.location.name}, ${pad.location.country_code}`} />
          {webcast_live && <Detail.Metadata.Label title="Live Stream" text="Available" icon={Icon.Video} />}
          {detailedLaunch?.agency && <Detail.Metadata.Label title="Agency" text={detailedLaunch.agency.name} />}
          {detailedLaunch?.info_urls &&
            detailedLaunch.info_urls.some((info) => !API_BASE_URLS.some((apiUrl) => info.url.startsWith(apiUrl))) && (
              <Detail.Metadata.Label
                title="Website"
                text={
                  detailedLaunch.info_urls.find((info) => !API_BASE_URLS.some((apiUrl) => info.url.startsWith(apiUrl)))
                    ?.title || "Available"
                }
              />
            )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {websiteUrl && <Action.OpenInBrowser url={websiteUrl} title="Open Launch Website" />}
          {webcast_live && url && !API_BASE_URLS.some((apiUrl) => url.startsWith(apiUrl)) && (
            <Action.OpenInBrowser url={url} title="Watch Live Stream" icon={Icon.Video} />
          )}
          <Action title="Go Back" icon={Icon.ArrowLeft} onAction={pop} shortcut={{ modifiers: ["cmd"], key: "[" }} />
        </ActionPanel>
      }
    />
  );
};

export default LaunchDetails;
