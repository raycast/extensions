import { List } from "@raycast/api";

import { SearchCommand } from "@/commands/search";
import { withFarragoRunning } from "@/contexts/appInfoContext";
import { ServicesProvider } from "@/contexts/servicesContext";

export default withFarragoRunning(
  () => (
    <ServicesProvider>
      <SearchCommand />
    </ServicesProvider>
  ),
  { LoadingComponent: List },
);
