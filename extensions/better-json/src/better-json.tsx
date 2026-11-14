import CoreTool from "./core/CoreTool";
import type { LaunchProps } from "@raycast/api";

export default function BetterJson({ draftValues }: LaunchProps) {
  return <CoreTool nativeDraft={typeof draftValues?.input === "string" ? draftValues.input : undefined} />;
}
