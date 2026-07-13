import CleanInfo from "./components/CleanInfo";
import { CACHES } from "./lib/cache";

export default function Command() {
  return (
    <CleanInfo
      title="Clean Swift Package Manager"
      description={CACHES.spm.info}
      caches={[CACHES.spm]}
    />
  );
}
