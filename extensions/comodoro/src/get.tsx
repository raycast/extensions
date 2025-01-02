import { useEffect, useState } from "react";
import { environment, getPreferenceValues, Icon, LaunchType, MenuBarExtra, showToast, Toast } from "@raycast/api";
import * as Exec from "./exec";
import * as Binary from "./binary";
import { Preferences } from "./preferences";

export interface State {
  isLoading: boolean;
  status: string | null;
  binary: boolean | null;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const [state, setState] = useState<State>({
    isLoading: true,
    status: null,
    binary: null,
  });

  useEffect(() => {
    (async () => {
      const binary = await Binary.has(preferences.binaryPath);

      setState((previous: State) => ({
        ...previous,
        binary: binary,
      }));

      if (!binary) {
        if (environment.launchType == LaunchType.UserInitiated) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Get failed",
            message: `Couldn't find binary at path: ${preferences.binaryPath}`,
          });
        }
      } else {
        const cmd = `${preferences.binaryPath} timer get ${preferences.preset} ${preferences.protocol}`;
        console.debug(`cmd: ${cmd}`);
        const { stdout, stderr } = await Exec.run(cmd, { env: {} });

        if (stdout) {
          setState((previous: State) => ({
            ...previous,
            isLoading: false,
            status: stdout,
          }));

          if (environment.launchType == LaunchType.UserInitiated) {
            await showToast({
              style: Toast.Style.Success,
              title: "Get succeeded",
              message: `Status: ${stdout}`,
            });
          }
        } else if (stderr) {
          console.log(stderr);

          setState((previous: State) => ({
            ...previous,
            isLoading: false,
          }));
        } else {
          setState((previous: State) => ({
            ...previous,
            isLoading: false,
          }));

          throw new Error("No results from stdout or stderr");
        }
      }
    })();
  }, []);

  let status: string = "Unknown";

  if (state.isLoading) {
    status = "Loading";
  } else if (!state.isLoading && state.binary) {
    status = state.status === null ? "-" : state.status;
  }

  return (
    <MenuBarExtra icon={Icon.Clock} isLoading={state.isLoading} title={status}>
      <MenuBarExtra.Item title={status} />
    </MenuBarExtra>
  );
}
