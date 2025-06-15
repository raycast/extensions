import { useEffect } from "react";

import type { LaunchProps } from "@raycast/api";
import { Toast, showToast } from "@raycast/api";

import useGoveeController from "@/hooks/useGoveeController";

import ControlGoveeLightsPage from "@/page/main";

import Execute from "./page/execute";

export default function ControlGoveeLights(props: LaunchProps<{ launchContext?: { scenario?: string } }>) {
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

  if (props.launchContext?.scenario) {
    return (
      <Execute id={props.launchContext.scenario} isLoading={isLoading} devices={devices} controller={controller} />
    );
  }

  return <ControlGoveeLightsPage devices={devices} isLoading={isLoading} executeScenario={executeScenario} />;
}
