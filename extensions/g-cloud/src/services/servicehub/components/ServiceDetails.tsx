import { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, Icon, Toast, showToast, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ServiceHubService, GCPService } from "../ServiceHubService";

interface ServiceDetailsProps {
  service: GCPService;
  serviceHub: ServiceHubService;
  onServiceStatusChange: (updatedService?: GCPService) => void;
}

export default function ServiceDetails({ service, serviceHub, onServiceStatusChange }: ServiceDetailsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [serviceDetails, setServiceDetails] = useState<GCPService | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    fetchServiceDetails();
  }, [service.name]);

  async function fetchServiceDetails() {
    try {
      setIsLoading(true);

      setServiceDetails(service);

      const isEnabled = await serviceHub.isServiceEnabled(service.name);

      if (isEnabled !== service.isEnabled) {
        const updatedService = {
          ...service,
          isEnabled,
          state: isEnabled ? "ENABLED" : "NOT_ACTIVATED",
        };
        setServiceDetails(updatedService);

        onServiceStatusChange(updatedService);
      } else {
        const details = await serviceHub.getServiceDetails(service.name);
        setServiceDetails(details);
      }
    } catch (error) {
      console.error(`Error fetching details for service ${service.name}:`, error);
      showFailureToast({
        title: "Failed to fetch service details",
        message: error instanceof Error ? error.message : String(error),
      });

      setServiceDetails(service);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleServiceStatus() {
    if (isToggling || !serviceDetails) return;

    try {
      setIsToggling(true);
      setIsLoading(true);

      if (serviceDetails.isEnabled) {
        showToast({
          style: Toast.Style.Animated,
          title: `Disabling ${serviceDetails.displayName || serviceDetails.name}...`,
        });

        await serviceHub.disableService(serviceDetails.name);

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const isStillEnabled = await serviceHub.isServiceEnabled(serviceDetails.name);

        if (!isStillEnabled) {
          showToast({
            style: Toast.Style.Success,
            title: `Disabled ${serviceDetails.displayName || serviceDetails.name}`,
          });

          const updatedService = {
            ...serviceDetails,
            isEnabled: false,
            state: "DISABLED",
          };
          setServiceDetails(updatedService);

          onServiceStatusChange(updatedService);
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: `Failed to disable ${serviceDetails.displayName || serviceDetails.name}`,
            message: "Service did not disable properly. Try again or check GCP Console.",
          });
        }
      } else {
        showToast({
          style: Toast.Style.Animated,
          title: `Enabling ${serviceDetails.displayName || serviceDetails.name}...`,
        });

        await serviceHub.enableService(serviceDetails.name);

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const isNowEnabled = await serviceHub.isServiceEnabled(serviceDetails.name);

        if (isNowEnabled) {
          showToast({
            style: Toast.Style.Success,
            title: `Enabled ${serviceDetails.displayName || serviceDetails.name}`,
          });

          const updatedService = {
            ...serviceDetails,
            isEnabled: true,
            state: "ENABLED",
          };
          setServiceDetails(updatedService);

          onServiceStatusChange(updatedService);
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: `Failed to enable ${serviceDetails.displayName || serviceDetails.name}`,
            message: "Service did not enable properly. Try again or check GCP Console.",
          });
        }
      }
    } catch (error) {
      console.error("Error toggling service status:", error);
      showFailureToast({
        title: "Failed to update service status",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsToggling(false);
      setIsLoading(false);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      fetchServiceDetails();
    }
  }

  function getMarkdownContent() {
    if (!serviceDetails) {
      return "Loading service details...";
    }

    return `
# ${serviceDetails.displayName || serviceDetails.name}

## Overview
${serviceDetails.description || "No description available."}

## Technical Information
| Property | Value |
|----------|-------|
| Service Name | \`${serviceDetails.name}\` |
| Status | ${serviceDetails.isEnabled ? "Enabled" : "Not Enabled"} |
${
  serviceDetails.state
    ? `| State | ${serviceDetails.state} |
`
    : ""
}| Category | ${serviceDetails.category || "Other"} |
| Region | ${serviceDetails.region || "global"} |

${
  serviceDetails.dependsOn && serviceDetails.dependsOn.length > 0
    ? `
## Dependencies
${serviceDetails.isEnabled ? "" : "**Note:** You must enable all dependencies before this service can function properly."}

| Service | 
|---------|
${serviceDetails.dependsOn.map((dep) => `| \`${dep}\` |`).join("\n")}
`
    : ""
}
    `;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={getMarkdownContent()}
      navigationTitle={serviceDetails?.displayName || service.displayName || service.name}
      metadata={
        serviceDetails ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Status"
              text={serviceDetails.isEnabled ? "Enabled" : "Not Enabled"}
              icon={{
                source: serviceDetails.isEnabled ? Icon.CheckCircle : Icon.XmarkCircle,
                tintColor: serviceDetails.isEnabled ? Color.Green : Color.SecondaryText,
              }}
            />
            <Detail.Metadata.Separator />

            <Detail.Metadata.Label title="Service Name" text={serviceDetails.name} />
            <Detail.Metadata.Label title="Category" text={serviceDetails.category || "Other"} />
            {serviceDetails.state && <Detail.Metadata.Label title="State" text={serviceDetails.state} />}
            {serviceDetails.region && <Detail.Metadata.Label title="Region" text={serviceDetails.region} />}

            {serviceDetails.dependsOn && serviceDetails.dependsOn.length > 0 && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.TagList title="Dependencies">
                  {serviceDetails.dependsOn.map((dep) => (
                    <Detail.Metadata.TagList.Item key={dep} text={dep} />
                  ))}
                </Detail.Metadata.TagList>
              </>
            )}

            {(serviceDetails.documentation || serviceDetails.console) && <Detail.Metadata.Separator />}

            {serviceDetails.documentation && (
              <Detail.Metadata.Link
                title="Documentation"
                target={serviceDetails.documentation}
                text="View Documentation"
              />
            )}

            {serviceDetails.console && (
              <Detail.Metadata.Link
                title="Google Cloud Console"
                target={serviceDetails.console}
                text="Open in Console"
              />
            )}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action
            title={serviceDetails?.isEnabled ? "Disable Service" : "Enable Service"}
            icon={serviceDetails?.isEnabled ? Icon.XmarkCircle : Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={toggleServiceStatus}
          />
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={fetchServiceDetails}
          />
        </ActionPanel>
      }
    />
  );
}
