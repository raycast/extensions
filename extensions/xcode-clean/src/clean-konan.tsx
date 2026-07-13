import CleanInfo from "./components/CleanInfo";
import { CACHES } from "./lib/cache";

export default function Command() {
  return (
    <CleanInfo
      title="Clean Kotlin/Native (.konan)"
      description={CACHES.konan.info}
      caches={[CACHES.konan]}
      warning="The next Kotlin/Native build will re-download the compiler, LLVM, and platform libraries (hundreds of MB). Plan accordingly."
    />
  );
}
