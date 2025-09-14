import { Action, ActionPanel, Detail, getPreferenceValues, Icon, openExtensionPreferences } from "@raycast/api";
import { useGlucoseData, useTreatmentData, useStatusData, useServerUnits } from "./hooks";
import { ErrorDetail, EventList, GlucoseStatsMetadata } from "./components";
import { createGraph } from "./utils/createGraph";
import { useCachedState } from "@raycast/utils";

export default function GlucoseView() {
  const preferences = getPreferenceValues<Preferences.GlucoseView>();
  const { units } = useServerUnits();
  const { status, isLoading: statusLoading, appError: statusError, refresh: refreshStatus } = useStatusData();
  const { readings, isLoading: glucoseLoading, appError: glucoseError, refresh: refreshGlucose } = useGlucoseData();
  const { treatments, isLoading: treatLoading, appError: treatError, refresh: refreshTreatments } = useTreatmentData();
  const [hoursToShow, setHoursToShow] = useCachedState<number>("hoursToShow", 2);

  const isLoading = glucoseLoading || treatLoading || statusLoading;
  const appError = glucoseError || treatError || statusError;

  const refresh = () => {
    refreshGlucose();
    refreshTreatments();
    refreshStatus();
  };

  // preferences/network error state
  if (appError) {
    return <ErrorDetail error={appError} />;
  }

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      metadata={<GlucoseStatsMetadata readings={readings} />}
      markdown={`![Glucose Graph](${createGraph(readings, hoursToShow, 700, 550, undefined, {
        useMmol: units === "mmol",
        logarithmic: preferences.graphScale === "logarithmic",
        targetLowMg: Number(status?.settings.thresholds.bgTargetBottom || 70),
        targetHighMg: Number(status?.settings.thresholds.bgTargetTop || 180),
        urgentLowMg: Number(status?.settings.thresholds.bgLow || 55),
        highAlertMg: Number(status?.settings.thresholds.bgHigh || 260),
      })})`}
      actions={
        <ActionPanel>
          <Action.Push
            title="View All Readings"
            icon={Icon.List}
            target={<EventList readings={readings} treatments={treatments} isLoading={isLoading} onRefresh={refresh} />}
          />
          <ActionPanel.Submenu title="Select Hours to Show" icon={Icon.Clock}>
            {[1, 2, 3, 4, 6, 12, 24].map((hours) => (
              <Action
                key={hours}
                title={`Last ${hours > 1 ? `${hours} Hours` : "Hour"}`}
                onAction={() => {
                  setHoursToShow(hours);
                }}
              />
            ))}
          </ActionPanel.Submenu>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser
            title="Open Nightscout Instance"
            url={preferences.instance}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}
