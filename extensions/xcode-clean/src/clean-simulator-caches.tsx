import CleanInfo from "./components/CleanInfo";
import { CACHES } from "./lib/cache";

export default function Command() {
  return (
    <CleanInfo
      title="Clean Simulator Caches"
      description={CACHES.simulatorCaches.info}
      caches={[CACHES.simulatorCaches]}
    />
  );
}
