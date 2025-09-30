import {
  ActionPanel,
  List,
  Action,
  Icon,
  showToast,
  Toast,
  Clipboard,
  open,
  showHUD,
  Form,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ParcelService, ParcelWithStatus } from "./parcel-service";
import { StorageService } from "./storage";
import { ParcelDetails } from "./parcel-details";
import { handleApiError } from "./utils/error-handler";
import { Ship24ApiClient } from "./api";
import { getPreferences } from "./preferences";
import { Ship24TrackingRequest } from "./types";

export default function Command() {
  const [parcels, setParcels] = useState<ParcelWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadParcels();
  }, []);

  async function loadParcels() {
    try {
      setIsLoading(true);
      const parcelsData = await ParcelService.getAllParcelsWithStatus();
      setParcels(parcelsData);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load parcels",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshParcels() {
    await loadParcels();
  }

  async function removeParcel(trackingNumber: string) {
    const options: Alert.Options = {
      title: "Remove Parcel",
      message: "Are you sure you want to remove this parcel from tracking?",
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      try {
        await StorageService.removeParcel(trackingNumber);
        setParcels((prev) => prev.filter((p) => p.trackingNumber !== trackingNumber));
        await showToast({
          style: Toast.Style.Success,
          title: "Parcel removed",
        });
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to remove parcel",
          message: err instanceof Error ? err.message : "Failed to remove parcel",
        });
      }
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
      const latestEvent = events.reduce((latest, event) =>
        new Date(event.datetime) > new Date(latest.datetime) ? event : latest,
      );
      const date = new Date(latestEvent.datetime);
      parts.push(date.toLocaleDateString());
    }

    return parts.join(" • ");
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search packages..."
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Package"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<AddPackageForm onPackageAdded={loadParcels} />}
          />
        </ActionPanel>
      }
    >
      {parcels.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Box}
          title="No Packages"
          description="Add your first package to start tracking"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Package"
                icon={Icon.Plus}
                target={<AddPackageForm onPackageAdded={loadParcels} />}
              />
            </ActionPanel>
          }
        />
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
                target={
                  <ParcelDetails
                    parcel={parcel}
                    onRefresh={refreshSingleParcel}
                    onRemovePackage={(trackingNumber) => {
                      setParcels((prev) => prev.filter((p) => p.trackingNumber !== trackingNumber));
                    }}
                  />
                }
              />
              <Action.Push
                title="Add Package"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<AddPackageForm onPackageAdded={loadParcels} />}
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
                title="Remove Package"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => removeParcel(parcel.trackingNumber)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface AddPackageFormProps {
  onPackageAdded: () => void;
}

function AddPackageForm({ onPackageAdded }: AddPackageFormProps) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [packageName, setPackageName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit() {
    if (!trackingNumber.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Tracking number is required",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { apiKey } = getPreferences();
      const apiClient = new Ship24ApiClient(apiKey);

      // Create tracker first, then search for results
      const trackingRequest: Ship24TrackingRequest = {
        trackingNumber: trackingNumber.trim(),
      };

      try {
        // Try to create the tracker first
        await apiClient.trackShipment(trackingRequest);
      } catch (error) {
        // If tracker already exists, that's fine, we'll get results below
        console.log("Tracker may already exist or creation failed:", error);
      }

      // Now get the tracking results
      const tracking = await apiClient.searchTrackingResults(trackingNumber.trim());

      // Save the parcel
      await StorageService.addParcel({
        trackingNumber: trackingNumber.trim(),
        name: packageName.trim() || undefined,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Package Added",
        message: tracking ? "Tracking information found" : "Package saved (tracking data will be fetched)",
      });

      onPackageAdded();
      pop();
    } catch (error) {
      handleApiError(error, "Failed to add package");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Package" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="trackingNumber"
        title="Tracking Number"
        placeholder="Enter tracking number"
        value={trackingNumber}
        onChange={setTrackingNumber}
      />
      <Form.TextField
        id="packageName"
        title="Package Name (Optional)"
        placeholder="e.g., iPhone Case, Books from Amazon"
        value={packageName}
        onChange={setPackageName}
      />
      <Form.Description text="Enter your tracking number to start monitoring your package. Ship24 supports 1200+ carriers worldwide including DHL, FedEx, UPS, USPS, Amazon, and more." />
    </Form>
  );
}
