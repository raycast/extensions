import { useEffect, useState } from "react";
import { Icon, MenuBarExtra, getPreferenceValues, showToast, Toast, environment, LaunchType } from "@raycast/api";
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
        const cmd = `${preferences.binaryPath} get ${preferences.preset} ${preferences.protocol}`;
        console.debug(`cmd: ${cmd}`);
        const { stdout, stderr } = await Exec.run(cmd, { env: { PATH: Exec.PATH } });

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

  if (state.isLoading) {
    return <MenuBarExtra icon={Icon.Clock} isLoading={state.isLoading} title="Loading"></MenuBarExtra>;
  } else if (!state.isLoading && state.binary) {
    const status: string = state.status === null ? "-" : state.status;

    return <MenuBarExtra icon={Icon.Clock} isLoading={state.isLoading} title={status}></MenuBarExtra>;
  } else {
    return null;
  }
}
