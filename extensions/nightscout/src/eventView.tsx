import { LaunchProps } from "@raycast/api";
import { ErrorDetail, EventList } from "./components";
import { useGlucoseData, useTreatmentData } from "./hooks";

interface LaunchContext {
  defaultFilter?: string;
}

export default function EventView(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const { readings, isLoading, appError, refresh } = useGlucoseData();
  const { treatments, isLoading: treatLoading, appError: treatError, refresh: refreshTreatments } = useTreatmentData();

  const defaultFilter = props.launchContext?.defaultFilter;

  if (appError) {
    return <ErrorDetail error={appError} />;
  }

  if (treatError) {
    return <ErrorDetail error={treatError} />;
  }

  return (
    <EventList
      readings={readings}
      treatments={treatments}
      isLoading={isLoading || treatLoading}
      onRefresh={() => {
        refresh();
        refreshTreatments();
      }}
      defaultFilter={defaultFilter}
    />
  );
}
