import CleanInfo from "./components/CleanInfo";
import { CACHES } from "./lib/cache";

export default function Command() {
  return (
    <CleanInfo
      title="Clean Device Support"
      description="Xcode downloads symbol files for every iOS / watchOS / tvOS / macOS version of every device you connect, so it can debug crashes and lldb sessions. These files accumulate over years and can grow to several GB. Cleaning them is safe. Xcode re-downloads what it needs the next time you connect a device on that OS."
      caches={[
        CACHES.iosDeviceSupport,
        CACHES.watchosDeviceSupport,
        CACHES.tvosDeviceSupport,
        CACHES.macosDeviceSupport,
        CACHES.iosDeviceLogs,
      ]}
      warning="Symbol files will be re-downloaded the next time you connect a device. The first debug session after cleaning may take a minute longer."
    />
  );
}
