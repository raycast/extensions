import { useEffect, useState } from "react";

import type { LaunchProps } from "@raycast/api";
import {
  Action,
  ActionPanel,
  Detail,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { applySnapshotDirect } from "@/lib/cloud";

import useGoveeController from "@/hooks/useGoveeController";

import ControlGoveeLightsPage from "@/page/main";

import Execute from "./page/execute";

type SnapshotLink = { sku: string; device: string; value: number; name: string };

/** Snapshot quicklink: one cloud request, then close. On failure the view stays open with the reason. */
const ApplySnapshot = ({ snapshot }: { snapshot: SnapshotLink }) => {
  const [error, setError] = useState<string>();
  useEffect(() => {
    const apiKey = getPreferenceValues<Preferences>().goveeApiKey?.trim();
    (apiKey
      ? applySnapshotDirect(apiKey, snapshot.sku, snapshot.device, snapshot.value)
      : Promise.reject(new Error("Set the Govee API key in the extension settings"))
    )
      .then(() => showHUD(`${snapshot.name} applied`))
      .then(() => popToRoot())
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        return showFailureToast(err, { title: "Couldn't Apply Snapshot" });
      });
  }, []);
  if (error) {
    return (
      <Detail
        markdown={`# Couldn't apply ${snapshot.name}\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }
  return <Detail isLoading markdown={`Applying snapshot: ${snapshot.name}`} />;
};

export default function ControlGoveeLights(
  props: LaunchProps<{ launchContext?: { scenario?: string; snapshot?: SnapshotLink } }>,
) {
  const { devices, isLoading, cloudLoading, error, retryCloud, executeScenario, controller } = useGoveeController();

  useEffect(() => {
    if (error && error.name !== "SyntaxError") {
      console.error("Error with Govee controller", error);
      showToast({
        title: "Error",
        message: error.message,
        style: Toast.Style.Failure,
      });
    }
  }, [error]);

  if (props.launchContext?.snapshot) {
    return <ApplySnapshot snapshot={props.launchContext.snapshot} />;
  }

  if (props.launchContext?.scenario) {
    return (
      <Execute id={props.launchContext.scenario} isLoading={isLoading} devices={devices} controller={controller} />
    );
  }

  return (
    <ControlGoveeLightsPage
      devices={devices}
      isLoading={isLoading || cloudLoading}
      error={error}
      retryCloud={retryCloud}
      executeScenario={executeScenario}
    />
  );
}
