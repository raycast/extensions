import { ActionPanel, List, Action, Icon, showToast, Toast, Clipboard, open, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { ParcelService, ParcelWithStatus } from "./parcel-service";
import { StorageService } from "./storage";
import { ParcelDetails } from "./parcel-details";
import { handleApiError } from "./utils/error-handler";

export default function Command() {
  const [parcels, setParcels] = useState<ParcelWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadParcels();
  }, []);

  async function loadParcels() {
    try {
      setIsLoading(true);

      // Load stored parcels immediately and show them
      const storedParcels = await StorageService.getParcels();
      const parcelsWithoutStatus = storedParcels.map((parcel) => ({ ...parcel }));
      setParcels(parcelsWithoutStatus);
      setIsLoading(false);

      // Then update with status in background
      const parcelsWithStatus = await ParcelService.getAllParcelsWithStatus();
      setParcels(parcelsWithStatus);
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to load parcels",
      });
      setIsLoading(false);
    }
  }

  async function refreshParcels() {
    await loadParcels();
    showToast({
      style: Toast.Style.Success,
      title: "Refreshed",
      message: "Parcel statuses updated",
    });
  }

  async function removeParcel(trackingNumber: string) {
    try {
      await StorageService.removeParcel(trackingNumber);
      await loadParcels();
      showToast({
        style: Toast.Style.Success,
        title: "Removed",
        message: `Parcel ${trackingNumber} removed`,
      });
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to remove parcel",
      });
    }
  }

  async function refreshSingleParcel(trackingNumber?: string) {
    if (trackingNumber) {
      try {
        const updatedParcel = await ParcelService.refreshSingleParcel(trackingNumber);
        if (updatedParcel) {
          setParcels((prev) => prev.map((p) => (p.trackingNumber === trackingNumber ? updatedParcel : p)));
        }
      } catch (err) {
        handleApiError(err, "Failed to refresh parcel");
      }
    } else {
      await loadParcels();
    }
  }

  function getStatusIcon(parcel: ParcelWithStatus): Icon {
    if (parcel.error) return Icon.ExclamationMark;
    if (!parcel.status) return Icon.QuestionMark;

    const milestone = parcel.status.shipment?.statusMilestone?.toLowerCase() || "";
    if (milestone.includes("delivered")) return Icon.CheckCircle;
    if (milestone.includes("transit") || milestone.includes("shipping")) return Icon.Airplane;
    if (milestone.includes("pickup") || milestone.includes("collected")) return Icon.Box;
    if (milestone.includes("exception") || milestone.includes("failed")) return Icon.ExclamationMark;
    return Icon.Clock;
  }

  function getStatusText(parcel: ParcelWithStatus): string {
    if (parcel.error) return `Error: ${parcel.error}`;
    if (!parcel.status) return "No status available";
    return parcel.status.shipment?.statusMilestone || parcel.status.shipment?.statusCategory || "Unknown status";
  }

  function getTitle(parcel: ParcelWithStatus): string {
    return parcel.name || parcel.trackingNumber;
  }

  function getSubtitle(parcel: ParcelWithStatus): string {
    const parts = [];
    if (parcel.name) parts.push(parcel.trackingNumber);
    if (parcel.status?.tracker?.courierCode && parcel.status.tracker.courierCode.length > 0) {
      parts.push(parcel.status.tracker.courierCode.join(", "));
    }

    // Get latest event date
    const events = parcel.status?.events || [];
    if (events.length > 0) {
      const latestEvent = events.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())[0];
      const date = new Date(latestEvent.datetime);
      parts.push(`Updated: ${date.toLocaleDateString()}`);
    }

    return parts.join(" • ");
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search parcels...">
      {parcels.length === 0 && !isLoading && (
        <List.EmptyView icon={Icon.Box} title="No Parcels" description="Add parcels to start tracking" />
      )}

      {parcels.map((parcel) => (
        <List.Item
          key={parcel.trackingNumber}
          icon={getStatusIcon(parcel)}
          title={getTitle(parcel)}
          subtitle={getSubtitle(parcel)}
          accessories={[{ text: getStatusText(parcel) }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                icon={Icon.Eye}
                target={<ParcelDetails parcel={parcel} onRefresh={refreshSingleParcel} />}
              />
              <Action
                title="Copy Tracking Number"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.copy(parcel.trackingNumber);
                  await showHUD("Tracking number copied to clipboard");
                }}
              />
              <Action
                title="Track on Ship24 Website"
                icon={Icon.Globe}
                onAction={() => open(`https://www.ship24.com/tracking?p=${parcel.trackingNumber}`)}
              />
              <Action
                title="Refresh Status"
                icon={Icon.ArrowClockwise}
                onAction={() => refreshSingleParcel(parcel.trackingNumber)}
              />
              <Action title="Refresh All" icon={Icon.ArrowClockwise} onAction={() => refreshParcels()} />
              <Action
                title="Remove Parcel"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => removeParcel(parcel.trackingNumber)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
