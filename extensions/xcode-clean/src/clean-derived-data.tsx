import CleanInfo from "./components/CleanInfo";
import { CACHES } from "./lib/cache";

export default function Command() {
  return (
    <CleanInfo
      title="Clean Derived Data"
      description={CACHES.derivedData.info}
      caches={[CACHES.derivedData]}
    />
  );
}
