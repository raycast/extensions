import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getMeasurements,
  isAuthenticated,
  WithingsMeasurement,
  authorize,
} from "./withings-api";

export default function ViewMeasurements() {
  const [measurements, setMeasurements] = useState<WithingsMeasurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const preferences = getPreferenceValues<Preferences>();

  // Calculate lookback days for empty view message
  const lookbackDays = parseInt(preferences.lookbackDays || "7", 10);
  const validLookbackDays =
    isNaN(lookbackDays) || lookbackDays < 1 ? 7 : lookbackDays;

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  async function checkAuthAndLoadData() {
    try {
      const isAuth = await isAuthenticated();
      setAuthenticated(isAuth);

      if (!isAuth) {
        setIsLoading(false);
        return;
      }

      await loadMeasurements();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error loading measurements",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setIsLoading(false);
    }
  }

  async function loadMeasurements() {
    try {
      setIsLoading(true);
      const data = await getMeasurements();
      setMeasurements(data);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error loading measurements",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAuthorize() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Authorizing with Withings...",
      });

      await authorize();

      await showToast({
        style: Toast.Style.Success,
        title: "Successfully authorized!",
      });

      setAuthenticated(true);
      await loadMeasurements();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Authorization failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (!authenticated) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Lock}
          title="Withings Not Connected"
          description="You need to authorize Raycast to access your Withings data"
          actions={
            <ActionPanel>
              <Action
                title="Authorize Withings"
                onAction={handleAuthorize}
                icon={Icon.Key}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search measurements...">
      {measurements.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Measurements Found"
          description={`No measurements found in the last ${validLookbackDays} days`}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                onAction={loadMeasurements}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      ) : (
        measurements.map((measurement, index) => (
          <MeasurementItem
            key={index}
            measurement={measurement}
            onRefresh={loadMeasurements}
          />
        ))
      )}
    </List>
  );
}

interface MeasurementItemProps {
  measurement: WithingsMeasurement;
  onRefresh: () => void;
}

function MeasurementItem({ measurement, onRefresh }: MeasurementItemProps) {
  const preferences = getPreferenceValues<Preferences>();
  const weightUnit = preferences.weightUnit || "lbs";

  const formattedDate = measurement.date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const accessories: List.Item.Accessory[] = [];

  // Display weight in user's preferred unit
  if (measurement.weight) {
    const weight =
      weightUnit === "kg" ? measurement.weight : measurement.weight * 2.20462;
    const unit = weightUnit === "kg" ? "kg" : "lb";
    accessories.push({
      tag: {
        value: `${weight.toFixed(1)} ${unit}`,
        color: Color.Blue,
      },
      icon: Icon.Weights,
      tooltip: "Weight",
    });
  }

  if (measurement.systolicBloodPressure && measurement.diastolicBloodPressure) {
    accessories.push({
      tag: {
        value: `${measurement.systolicBloodPressure.toFixed(0)}/${measurement.diastolicBloodPressure.toFixed(0)}`,
        color: Color.Red,
      },
      icon: Icon.Heart,
      tooltip: "Blood Pressure (systolic/diastolic)",
    });
  }

  if (measurement.heartPulse) {
    accessories.push({
      tag: {
        value: `${measurement.heartPulse.toFixed(0)} bpm`,
        color: Color.Orange,
      },
      icon: Icon.Heartbeat,
      tooltip: "Heart Rate",
    });
  }

  if (measurement.fatRatio) {
    accessories.push({
      tag: {
        value: `${measurement.fatRatio.toFixed(1)}%`,
        color: Color.Purple,
      },
      tooltip: "Body Fat %",
    });
  }

  const subtitle = buildSubtitle(measurement);

  return (
    <List.Item
      title={formattedDate}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            onAction={onRefresh}
            icon={Icon.ArrowClockwise}
          />
          <Action.CopyToClipboard
            title="Copy Details"
            content={JSON.stringify(measurement, null, 2)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function buildSubtitle(measurement: WithingsMeasurement): string {
  const preferences = getPreferenceValues<Preferences>();
  const weightUnit = preferences.weightUnit || "lbs";
  const parts: string[] = [];

  if (measurement.weight) {
    const weight =
      weightUnit === "kg" ? measurement.weight : measurement.weight * 2.20462;
    const unit = weightUnit === "kg" ? "kg" : "lb";
    parts.push(`Weight: ${weight.toFixed(1)} ${unit}`);
  }

  if (measurement.systolicBloodPressure && measurement.diastolicBloodPressure) {
    parts.push(
      `BP: ${measurement.systolicBloodPressure.toFixed(0)}/${measurement.diastolicBloodPressure.toFixed(0)}`,
    );
  }

  return parts.join(" • ");
}
