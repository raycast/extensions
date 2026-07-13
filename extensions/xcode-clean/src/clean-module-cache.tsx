import CleanInfo from "./components/CleanInfo";
import { CACHES } from "./lib/cache";

export default function Command() {
  return (
    <CleanInfo
      title="Clean Module Cache"
      description={CACHES.moduleCache.info}
      caches={[CACHES.moduleCache]}
    />
  );
}
