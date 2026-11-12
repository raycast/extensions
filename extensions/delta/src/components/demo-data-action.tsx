import { Action, environment, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { isDemoMode, setDemoMode } from "../lib/demo";

/**
 * Switches between real threads and made-up ones for Store screenshots. Only rendered while
 * developing, so it never appears in the Store build.
 */
export function DemoDataAction({ onChange }: { onChange: () => void }) {
  const [isOn, setIsOn] = useState(isDemoMode);
  if (!environment.isDevelopment) {
    return null;
  }
  return (
    <Action
      title={isOn ? "Use Real Delta Data" : "Use Demo Data"}
      icon={isOn ? Icon.Undo : Icon.Wand}
      onAction={async () => {
        setDemoMode(!isOn);
        setIsOn(!isOn);
        onChange();
        await showToast({
          style: Toast.Style.Success,
          title: isOn ? "Showing your Delta threads" : "Showing demo threads",
        });
      }}
    />
  );
}
