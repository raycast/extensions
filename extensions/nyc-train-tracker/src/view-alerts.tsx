import { useState, useEffect, useCallback } from "react";
import { ActionPanel, Action, List, Icon, Color, showToast, Toast, Detail, environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { formatDistanceToNow, format } from "date-fns";
import { fetchAlerts } from "./utils/api";
import { ProcessedServiceAlert } from "./types";

// --- Helper Function for Safe Date Formatting ---
function formatAlertDate(date: Date | null | undefined, formatString: string): string {
  // Check if date is null/undefined OR an invalid Date object
  if (!date || isNaN(date.getTime())) {
    return "N/A";
  }
  try {
    // Pass the Date object directly to format
    return format(date, formatString);
  } catch (e) {
    console.warn("Failed to format valid date object:", date, e);
    return "Formatting Error"; // Should not happen with valid Date object
  }
}

// Corrected type hint to accept Date objects or null/undefined directly
function formatAlertDistance(date: Date | null | undefined): string {
  // Check if date is null/undefined OR an invalid Date object
  if (!date || isNaN(date.getTime())) {
    return "N/A";
  }
  try {
    // Pass the Date object directly to formatDistanceToNow
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (e) {
    console.warn("Failed to format distance for valid date object:", date, e);
    return "Formatting Error"; // Should not happen with valid Date object
  }
}

interface ViewAlertsCommandProps {
  initialFilterLines?: string[]; // Optional lines to filter by initially
  initialFilterStationId?: string; // Optional station ID to filter by initially
}

export default function ViewAlertsCommand(props: ViewAlertsCommandProps = {}) {
  // Default empty props
  const { initialFilterLines, initialFilterStationId } = props; // Default to showing active alerts if navigated to with a line filter
  const [processedAlerts, setProcessedAlerts] = useState<ProcessedServiceAlert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Store current filter state locally within this instance
  const [filterLines] = useState<string[] | undefined>(initialFilterLines); // Keep initial line filter

  // Callback to fetch and update CACHE with RAW data
  const loadAlerts = useCallback(
    async (showLoadingToast = false) => {
      setIsLoading(true);
      setError(null); // Clear previous errors on load attempt
      if (showLoadingToast) {
        showToast({ style: Toast.Style.Animated, title: "Refreshing Alerts..." });
      }
      try {
        // Fetch raw ServiceAlert[] with string dates
        const alertsWithDates = await fetchAlerts(filterLines, initialFilterStationId);
        setProcessedAlerts(alertsWithDates);
      } catch (err: unknown) {
        console.error("Failed to fetch alerts:", err);
        const message = err instanceof Error ? err.message : "Could not load service alerts.";
        setError(message); // Set error state
        showFailureToast(err, { title: "Error Loading Alerts" });
      } finally {
        setIsLoading(false);
      }
    },
    [filterLines], // Dependencies
  );

  // Effect to load initially or if cache stale
  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Service Alerts"
      searchBarPlaceholder="Search alerts..."
      // Global Actions
      actions={
        <ActionPanel>
          <Action
            title="Refresh Alerts"
            icon={Icon.ArrowClockwise}
            onAction={() => loadAlerts(true)}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {/* Error View */}
      {error && !isLoading && <List.EmptyView icon={Icon.Warning} title="Could Not Load Alerts" description={error} />}

      {/* No Alerts View */}
      {!isLoading &&
        !error &&
        processedAlerts.length === 0 && ( // Check processed length
          <List.EmptyView
            icon={Icon.CheckCircle}
            title="No Service Alerts"
            description="Transit services appear to be operating normally."
          />
        )}

      {/* Alerts List */}
      {!error &&
        processedAlerts.length > 0 && ( // Render only if no error and alerts exist
          <List.Section title="Current Alerts">
            {/* Map over PROCESSED alerts */}
            {processedAlerts.map((alert) => (
              // Pass the ProcessedServiceAlert object directly
              <AlertListItem key={alert.id} alert={alert} onRefresh={() => loadAlerts(true)} />
            ))}
          </List.Section>
        )}
    </List>
  );
}

// --- AlertListItem Component ---
// Accepts ProcessedServiceAlert with Date objects
interface AlertListItemProps {
  alert: ProcessedServiceAlert;
  onRefresh: () => void;
}

function AlertListItem({ alert, onRefresh }: AlertListItemProps) {
  const getSeverityColor = (alert: ProcessedServiceAlert): Color => {
    if (alert.title.toLowerCase().includes("suspend")) return Color.Red;
    if (alert.title.toLowerCase().includes("delay")) return Color.Orange;
    return Color.Orange; // Corrected: Defaulting to Orange for general alerts not suspend/delay
  };

  const displayDate = alert.startDate || null; // Use start date primarily for display timing

  // Use the safe formatters directly with the Date object
  const accessoryText = formatAlertDistance(displayDate); // Will be "N/A" if invalid/old
  const tooltipText = displayDate ? `Started: ${formatAlertDate(displayDate, "PPpp")}` : undefined; // Will show N/A in tooltip

  return (
    <List.Item
      icon={{ source: Icon.ExclamationMark, tintColor: getSeverityColor(alert) }}
      title={alert.title}
      subtitle={alert.affectedLinesLabels.join(", ")}
      accessories={[
        {
          text: accessoryText,
          icon: Icon.Calendar,
          tooltip: tooltipText,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {/* Pass the ProcessedServiceAlert object to the Detail view */}
            <Action.Push title="View Alert Details" icon={Icon.Sidebar} target={<AlertDetailView alert={alert} />} />
            {alert.url && (
              <Action.OpenInBrowser
                title="Open on Website"
                url={alert.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
            )}
            <Action
              title="Refresh Alerts"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Alert Title"
              content={alert.title}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Alert Details"
              content={alert.description} // Copies the original description text
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// --- AlertDetailView Component ---
// Accepts ProcessedServiceAlert with Date objects
interface AlertDetailViewProps {
  alert: ProcessedServiceAlert;
}

function AlertDetailView({ alert }: AlertDetailViewProps) {
  // Use safe date formatting helpers here too, passing Date objects
  const startDateFormatted = formatAlertDate(alert.startDate, "PPpp");
  const startDateDistance = formatAlertDistance(alert.startDate);
  const endDateFormatted = formatAlertDate(alert.endDate, "PPpp");

  // --- Process the description to replace text with asset images ---
  let processedDescription = alert.description;

  // Replace [shuttle bus icon] with the SVG asset
  processedDescription = processedDescription.replace(
    /\[shuttle bus icon\]/g,
    `![Shuttle Bus Icon](${environment.assetsPath}/mta-shuttle.svg) `,
  );

  // Replace [accessibility icon] with the SVG asset
  processedDescription = processedDescription.replace(
    /\[accessibility icon\]/g,
    `![Accessibility Icon](${environment.assetsPath}/mta-accessibility.svg) `,
  );

  const markdown = `
# ${alert.title}

**Started:** ${startDateFormatted === "N/A" ? "N/A" : `${startDateDistance} (${startDateFormatted})`}
${alert.endDate && endDateFormatted !== "N/A" ? `\n**Ends:** ${endDateFormatted}` : ""}

---

${processedDescription}

${alert.url ? `\n[View on Website](${alert.url})` : ""}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={alert.title}
      actions={
        <ActionPanel>
          {alert.url && <Action.OpenInBrowser title="Open on Website" url={alert.url} />}
          <Action.CopyToClipboard title="Copy Details" content={alert.description} />
          <Action.CopyToClipboard title="Copy Title" content={alert.title} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Started" text={startDateFormatted} icon={Icon.Calendar} />
          {alert.endDate && <Detail.Metadata.Label title="Ends" text={endDateFormatted} icon={Icon.Calendar} />}
          <Detail.Metadata.Separator />
          {alert.affectedLinesLabels.length > 0 && (
            <Detail.Metadata.TagList title="Affected Lines">
              {alert.affectedLinesLabels.map((line) => (
                <Detail.Metadata.TagList.Item key={line} text={line} color={Color.Red} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {alert.affectedStationsLabels.length > 0 && (
            <Detail.Metadata.TagList title="Affected Stations">
              {alert.affectedStationsLabels.map((station) => (
                <Detail.Metadata.TagList.Item key={station} text={station} color={Color.Red} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {alert.url && <Detail.Metadata.Link title="Official Link" target={alert.url} text="Website" />}
          <Detail.Metadata.Separator />
        </Detail.Metadata>
      }
    />
  );
}
