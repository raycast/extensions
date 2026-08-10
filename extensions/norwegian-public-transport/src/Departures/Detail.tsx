import { Color, Icon, Image, List, environment } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { SjEstimatedCall } from "../types";
import {
  formatAsClock,
  formatDestinationDisplay,
  getSubModeText,
  getTransportIcon,
} from "../utils";
import { Departure } from "../api/departuresQuery";

type DetailProps = {
  ec: Departure;
  destinationQuayId?: string;
};

export function Detail({ ec, destinationQuayId }: DetailProps) {
  const theme = environment.appearance;
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Scheduled departure"
            text={
              new Date(ec.aimedDepartureTime).toLocaleDateString("no-no") +
              " " +
              new Date(ec.aimedDepartureTime).toLocaleTimeString("no-no")
            }
          />
          {ec.realtime && ec.expectedDepartureTime && (
            <List.Item.Detail.Metadata.Label
              title={`Estimated departure (${
                ec.predictionInaccurate ? "inaccurate" : "real time"
              })`}
              text={new Date(ec.expectedDepartureTime).toLocaleTimeString("no-no")}
              icon={
                ec.realtime
                  ? {
                      source: Icon.CircleProgress100,
                      tintColor: ec.predictionInaccurate ? Color.Yellow : Color.Green,
                    }
                  : { source: Icon.Signal1, tintColor: Color.SecondaryText }
              }
            />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Authority"
            text={ec.serviceJourney.line.authority?.name}
            icon={
              ec.serviceJourney.line.authority?.url
                ? getFavicon(ec.serviceJourney.line.authority?.url, {
                    mask: Image.Mask.RoundedRectangle,
                  })
                : undefined
            }
          />
          <List.Item.Detail.Metadata.Label
            title="Line"
            text={`${ec.serviceJourney.line.publicCode ?? ""} ${formatDestinationDisplay(
              ec.destinationDisplay,
            )}`}
            icon={{
              ...getTransportIcon(
                ec.serviceJourney.line.transportMode,
                ec.serviceJourney.line.transportSubmode,
              ),
              tintColor: Color.SecondaryText,
            }}
          />

          {ec.serviceJourney.line.transportSubmode &&
            ec.serviceJourney.line.transportSubmode !== "unknown" && (
              <List.Item.Detail.Metadata.Label
                title="Mode of transport"
                text={getSubModeText(ec.serviceJourney.line.transportSubmode)}
              />
            )}
        </List.Item.Detail.Metadata>
      }
      markdown={getEstimatedCallsMarkdown(
        ec.serviceJourney.estimatedCalls,
        ec.quay.id,
        theme,
        destinationQuayId,
      )}
    />
  );
}

const ENTUR_LOGO_B64_DARK_BLUE =
  "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiBoZWlnaHQ9IjIwLjgzIiB3aWR0aD0iNjguNjMiPjxkZWZzPjxwYXRoIGlkPSJhIiBkPSJNNTAuOTQgNi4wOHY4LjY1YTQuMSA0LjEgMCAwIDEtLjM1IDEuOCAyLjk3IDIuOTcgMCAwIDEtMS45NiAxLjdjLS40LjEtLjc1LjE2LTEuMDYuMTYtLjMgMC0uNjYtLjA1LTEuMDUtLjE2LS40LS4xLS43Ni0uMy0xLjEtLjU3YTMuMjUgMy4yNSAwIDAgMS0uODYtMS4xMyA0LjEgNC4xIDAgMCAxLS4zNS0xLjhWNi4wOEg0MS41djguNjVjMCAuOTIuMTQgMS43Ni40MyAyLjUxYTUuNDYgNS40NiAwIDAgMCAzLjE1IDMuMTUgNi44IDYuOCAwIDAgMCAyLjUuNDRjLjkyIDAgMS43Ni0uMTUgMi41LS40NGE1LjMzIDUuMzMgMCAwIDAgMy4xMy0zLjE1Yy4yOS0uNzUuNDMtMS41OS40My0yLjUxVjYuMDh6Ii8+PHBhdGggaWQ9ImIiIGQ9Ik01Ni43MyA2LjA4djE0LjQ5aDIuNzF2LTQuNjJoMi42OGwzLjI4IDQuNjJoMy4yMkw2NS4xIDE1LjdjLjQ0LS4xMi44NC0uMzMgMS4yMS0uNjNzLjY4LS42NS45My0xLjA2YTUuODEgNS44MSAwIDAgMCAuOC0yLjk1YzAtLjcyLS4xMS0xLjQtLjM1LTJhNC40IDQuNCAwIDAgMC0yLjU0LTIuNjEgNS4xOCA1LjE4IDAgMCAwLTEuOTktLjM3em0yLjcxIDIuNDVoMy4wOWMuNSAwIC45Mi4wNyAxLjI4LjIuMzUuMTMuNjQuMy44Ni41My4yMy4yMy40LjUuNS44LjExLjMuMTcuNjMuMTcuOTkgMCAuMy0uMDQuNi0uMTIuOS0uMDcuMy0uMjIuNTYtLjQzLjhzLS41LjQzLS44Ny41N2MtLjM3LjE1LS44My4yMi0xLjQuMjJoLTMuMDh6Ii8+PC9kZWZzPjxnIGZpbGwtcnVsZT0iZXZlbm9kZCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iIzE4MWM1NiIgZD0iTTEwLjQyIDE0LjQ5di0yLjQ1SDIuNzFWOC41M2g2Ljg0VjYuMDhIMi43MVYyLjQ2aDcuNzFWMEgwdjE0LjQ5ek0xMy41IDBoLS4yOXYxNC40OWgyLjdWNS44OGw5LjMgOC42MWguMjlWMGgtMi43MXY4Ljc3eiIvPjxwYXRoIGZpbGw9IiNmZjU5NTkiIGQ9Ik0yNS41IDE3LjgySDB2Mi4yM2gyNS41eiIvPjxwYXRoIGZpbGw9IiMxODFjNTYiIGQ9Ik0zMi42MSA4LjUzdjEyLjA0aDIuN1Y4LjUzaDQuMDRWNi4wOGgtMTAuOHYyLjQ1eiIvPjx1c2UgaGVpZ2h0PSIxMDAlIiB3aWR0aD0iMTAwJSIgeGxpbms6aHJlZj0iI2EiIGZpbGw9IiMxODFjNTYiLz48dXNlIGhlaWdodD0iMTAwJSIgd2lkdGg9IjEwMCUiIHhsaW5rOmhyZWY9IiNiIiBmaWxsPSIjMTgxYzU2Ii8+PC9nPjwvc3ZnPg==";
const ENTUR_LOGO_B64_WHITE =
  "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiBoZWlnaHQ9IjIwLjgzIiB3aWR0aD0iNjguNjMiPjxkZWZzPjxwYXRoIGlkPSJhIiBkPSJNNTAuOTQgNi4wOHY4LjY1YTQuMSA0LjEgMCAwIDEtLjM1IDEuOCAyLjk3IDIuOTcgMCAwIDEtMS45NiAxLjdjLS40LjEtLjc1LjE2LTEuMDYuMTYtLjMgMC0uNjYtLjA1LTEuMDUtLjE2LS40LS4xLS43Ni0uMy0xLjEtLjU3YTMuMjUgMy4yNSAwIDAgMS0uODYtMS4xMyA0LjEgNC4xIDAgMCAxLS4zNS0xLjhWNi4wOEg0MS41djguNjVjMCAuOTIuMTQgMS43Ni40MyAyLjUxYTUuNDYgNS40NiAwIDAgMCAzLjE1IDMuMTUgNi44IDYuOCAwIDAgMCAyLjUuNDRjLjkyIDAgMS43Ni0uMTUgMi41LS40NGE1LjMzIDUuMzMgMCAwIDAgMy4xMy0zLjE1Yy4yOS0uNzUuNDMtMS41OS40My0yLjUxVjYuMDh6Ii8+PHBhdGggaWQ9ImIiIGQ9Ik01Ni43MyA2LjA4djE0LjQ5aDIuNzF2LTQuNjJoMi42OGwzLjI4IDQuNjJoMy4yMkw2NS4xIDE1LjdjLjQ0LS4xMi44NC0uMzMgMS4yMS0uNjNzLjY4LS42NS45My0xLjA2YTUuODEgNS44MSAwIDAgMCAuOC0yLjk1YzAtLjcyLS4xMS0xLjQtLjM1LTJhNC40IDQuNCAwIDAgMC0yLjU0LTIuNjEgNS4xOCA1LjE4IDAgMCAwLTEuOTktLjM3em0yLjcxIDIuNDVoMy4wOWMuNSAwIC45Mi4wNyAxLjI4LjIuMzUuMTMuNjQuMy44Ni41My4yMy4yMy40LjUuNS44LjExLjMuMTcuNjMuMTcuOTkgMCAuMy0uMDQuNi0uMTIuOS0uMDcuMy0uMjIuNTYtLjQzLjhzLS41LjQzLS44Ny41N2MtLjM3LjE1LS44My4yMi0xLjQuMjJoLTMuMDh6Ii8+PC9kZWZzPjxnIGZpbGwtcnVsZT0iZXZlbm9kZCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTEwLjQyIDE0LjQ5di0yLjQ1SDIuNzFWOC41M2g2Ljg0VjYuMDhIMi43MVYyLjQ2aDcuNzFWMEgwdjE0LjQ5ek0xMy41IDBoLS4yOXYxNC40OWgyLjdWNS44OGw5LjMgOC42MWguMjlWMGgtMi43MXY4Ljc3eiIvPjxwYXRoIGZpbGw9IiNmZjU5NTkiIGQ9Ik0yNS41IDE3LjgySDB2Mi4yM2gyNS41eiIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0zMi42MSA4LjUzdjEyLjA0aDIuN1Y4LjUzaDQuMDRWNi4wOGgtMTAuOHYyLjQ1eiIvPjx1c2UgaGVpZ2h0PSIxMDAlIiB3aWR0aD0iMTAwJSIgeGxpbms6aHJlZj0iI2EiIGZpbGw9IiNmZmYiLz48dXNlIGhlaWdodD0iMTAwJSIgd2lkdGg9IjEwMCUiIHhsaW5rOmhyZWY9IiNiIiBmaWxsPSIjZmZmIi8+PC9nPjwvc3ZnPg==";

function getEstimatedCallsMarkdown(
  ec: Array<SjEstimatedCall>,
  quayId: string,
  theme: "light" | "dark",
  destinationQuayId?: string,
) {
  const currentIndex = ec.findIndex((a) => a.quay.id === quayId);
  const destinationIndex = ec.findIndex((a) => a.quay.id === destinationQuayId);
  if (!ec.length || currentIndex < 0) return;

  const upcomingEstimatedCalls =
    destinationIndex >= 0 ? ec.slice(currentIndex, destinationIndex + 1) : ec.slice(currentIndex);
  const numberOfTruncatedStops = currentIndex - 1;
  const numberOfRemainingStops = destinationIndex >= 0 ? ec.length - destinationIndex - 2 : 0;
  const lastStop =
    destinationIndex >= 0 && destinationIndex < ec.length - 1 ? ec[ec.length - 1] : undefined;

  const lines: Array<string | false> = [
    currentIndex > 0 && `${estimatedCallText(ec[0])}`,
    numberOfTruncatedStops === 1 && `${estimatedCallText(ec[1])}`,
    numberOfTruncatedStops > 1 && `••• ${numberOfTruncatedStops} intermediate stops •••`,
    ...upcomingEstimatedCalls.map((e) => {
      return e.quay.id === quayId || e.quay.id === destinationQuayId
        ? `---\n\n## ${estimatedCallText(e)}\n\n---`
        : estimatedCallText(e);
    }),
    numberOfRemainingStops > 0 && `••• ${numberOfRemainingStops} remaining stops •••`,
    !!lastStop && `${estimatedCallText(lastStop)}`,
  ].filter(Boolean);

  const content = lines.join("\n\n");

  // This disclaimer is required by Entur's license
  // https://developer.entur.org/pages-intro-setup-and-access#licenses
  const entur_footer = `Data made available by Entur\n\n![](data:image/svg+xml;base64,${theme === "light" ? ENTUR_LOGO_B64_DARK_BLUE : ENTUR_LOGO_B64_WHITE})`;

  return content + "\n\n---\n\n" + entur_footer;
}

function estimatedCallText(e: SjEstimatedCall) {
  return `\`${formatAsClock(e.expectedDepartureTime || e.aimedDepartureTime)}\` ${e.quay.name} ${
    e.quay.publicCode ?? ""
  }`;
}
