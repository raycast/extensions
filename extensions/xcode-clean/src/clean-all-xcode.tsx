import CleanInfo from "./components/CleanInfo";
import { CACHES } from "./lib/cache";

export default function Command() {
  return (
    <CleanInfo
      title="Clean All Xcode Caches"
      description="Cleans **Derived Data**, the **Swift Package Manager** download cache, generic **Xcode application caches**, and **Simulator caches** in one shot.\n\n**Module Cache** is included implicitly because it lives inside Derived Data. **Device Support** files are intentionally left untouched. Clean those separately if you want to."
      caches={[
        CACHES.derivedData,
        CACHES.spm,
        CACHES.xcodeCaches,
        CACHES.simulatorCaches,
      ]}
      warning="The next build of every Xcode project on this machine will be a clean build."
    />
  );
}
