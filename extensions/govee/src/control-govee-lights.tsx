import { useEffect } from "react";

import type { LaunchProps } from "@raycast/api";
import { Detail, Toast, getPreferenceValues, popToRoot, showHUD, showToast } from "@raycast/api";

import { applySnapshotDirect } from "@/lib/cloud";

import useGoveeController from "@/hooks/useGoveeController";

import ControlGoveeLightsPage from "@/page/main";

import Execute from "./page/execute";

type SnapshotLink = { sku: string; device: string; value: number; name: string };

/** Snapshot quicklink: one cloud request, then close. */
const ApplySnapshot = ({ snapshot }: { snapshot: SnapshotLink }) => {
  useEffect(() => {
    const apiKey = getPreferenceValues<Preferences>().goveeApiKey?.trim();
    (apiKey
      ? applySnapshotDirect(apiKey, snapshot.sku, snapshot.device, snapshot.value)
      : Promise.reject(new Error("Set the Govee API key in the extension settings"))
    )
      .then(() => showHUD(`${snapshot.name} applied`))
      .catch((err) =>
        showToast({
          style: Toast.Style.Failure,
          title: "Couldn't apply snapshot",
          message: String(err?.message ?? err),
        }),
      )
      .finally(() => popToRoot());
  }, []);
  return <Detail isLoading markdown={`Applying snapshot: ${snapshot.name}`} />;
};

export default function ControlGoveeLights(
  props: LaunchProps<{ launchContext?: { scenario?: string; snapshot?: SnapshotLink } }>,
) {
  const { devices, isLoading, error, executeScenario, controller } = useGoveeController();

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

  return <ControlGoveeLightsPage devices={devices} isLoading={isLoading} executeScenario={executeScenario} />;
}
