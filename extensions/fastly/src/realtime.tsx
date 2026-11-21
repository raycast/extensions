import { Icon } from "@raycast/api";
import { ServicePicker } from "./views/service-picker";
import { RealtimeStats } from "./views/realtime-stats";

export default function Command() {
  return (
    <ServicePicker
      actionTitle="Watch Real-Time Stats"
      actionIcon={Icon.LineChart}
      searchBarPlaceholder="Pick a service to watch..."
      getTarget={(service) => <RealtimeStats service={service} />}
    />
  );
}
