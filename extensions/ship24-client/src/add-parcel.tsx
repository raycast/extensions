import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { StorageService } from "./storage";
import { Ship24ApiClient } from "./api";
import { getPreferences } from "./preferences";
import { TrackingResult } from "./tracking-result";
import { Ship24TrackingRequest, TrackingResultState } from "./types";

type Values = {
  trackingNumber: string;
  name: string;
};

export default function Command() {
  const [trackingResult, setTrackingResult] = useState<TrackingResultState | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  async function handleSubmit(values: Values) {
    if (!values.trackingNumber.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Tracking number is required",
      });
      return;
    }

    setIsTracking(true);

    try {
      const { apiKey } = getPreferences();
      const apiClient = new Ship24ApiClient(apiKey);

      const trackingRequest: Ship24TrackingRequest = {
        trackingNumber: values.trackingNumber.trim(),
      };

      const response = await apiClient.trackShipment(trackingRequest);
      const tracking = response.data.trackings[0];

      // Save to storage after successful API call
      await StorageService.addParcel({
        trackingNumber: values.trackingNumber.trim(),
        name: values.name.trim() || undefined,
      });

      // Show tracking result
      setTrackingResult({
        trackingNumber: values.trackingNumber.trim(),
        name: values.name.trim() || undefined,
        tracking: tracking,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Parcel Added",
        message: `Tracking ${values.trackingNumber} has been added`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add parcel";

      // Show error in tracking result
      setTrackingResult({
        trackingNumber: values.trackingNumber.trim(),
        name: values.name.trim() || undefined,
        error: errorMessage,
      });

      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setIsTracking(false);
    }
  }

  if (trackingResult) {
    return (
      <TrackingResult
        trackingNumber={trackingResult.trackingNumber}
        name={trackingResult.name}
        tracking={trackingResult.tracking || null}
        error={trackingResult.error}
      />
    );
  }

  return (
    <Form
      isLoading={isTracking}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title={isTracking ? "Tracking…" : "Add Parcel"} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a new parcel to track" />
      <Form.TextField id="trackingNumber" title="Tracking Number" placeholder="Enter tracking number" defaultValue="" />
      <Form.TextField id="name" title="Name" placeholder="Optional name for the parcel" defaultValue="" />
    </Form>
  );
}
