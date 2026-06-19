import { Detail } from "@raycast/api";
import { useEffect } from "react";
import { logGranolaError } from "../utils/errorUtils";

interface UnresponsiveProps {
  context?: string;
  error?: Error;
}

export default function Unresponsive({ context = "unknown", error }: UnresponsiveProps) {
  useEffect(() => {
    logGranolaError("Unresponsive screen shown", error ?? new Error("Granola service unreachable"), { context });
  }, [context, error]);

  return (
    <Detail
      markdown={`# Error from Granola \n\n Could not communicate with the Granola service. Please make sure Granola is open, running, and that you are logged in, then try again.`}
    />
  );
}
