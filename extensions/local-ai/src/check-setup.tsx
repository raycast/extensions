import { SetupStatus } from "./components/SetupStatus";
import { usePreflight } from "./hooks/usePreflight";

export default function Command() {
  const { result, isLoading, recheck } = usePreflight();
  return <SetupStatus result={result} isLoading={isLoading} onRecheck={recheck} />;
}
