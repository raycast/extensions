import CleanInfo from "./components/CleanInfo";
import { CACHES } from "./lib/cache";

export default function Command() {
  return (
    <CleanInfo
      title="Clean Global Gradle Caches"
      description={CACHES.gradleGlobal.info}
      caches={[CACHES.gradleGlobal]}
      warning="Every Gradle project on this machine will re-download dependencies on the next build. For a per-project clean, prefer Deep Clean from the Kotlin Multiplatform Project command."
    />
  );
}
