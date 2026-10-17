import {
  Action,
  ActionPanel,
  Application,
  Color,
  Icon,
  LaunchProps,
  List,
  Toast,
  environment,
  open,
  openExtensionPreferences,
  popToRoot,
  showToast,
} from "@raycast/api";
import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { FC } from "react";

import { FarragoOscPinger } from "@/services/farrago-osc/farragoOscPinger";
import { GET_FARRAGO_URL, OSC_SETUP_INSTRUCTIONS_URL } from "@/utils/constants";
import {
  checkFarragoExists,
  farragoDataDirExists,
  findFarrago,
  getPreferences,
  ignoreAbortError,
  isFarragoRunning,
  launchFarrago,
} from "@/utils/helpers";

// * CONTEXT

const FarragoAppInfoContext = createContext<ReturnType<typeof useFarragoAppInfo> | undefined>(undefined);

export function FarragoAppInfoProvider({ children }: { children: ReactNode }) {
  const value = useFarragoAppInfo();
  return <FarragoAppInfoContext.Provider value={value}>{children}</FarragoAppInfoContext.Provider>;
}

// * HOOKS

function useOscPing() {
  const [pinging, setPinging] = useState(true);
  const [oscIsAlive, setOscIsAlive] = useState(false);

  useEffect(() => {
    const pinger = new FarragoOscPinger();
    pinger.rcv.open();
    pinger
      .ping()
      .then((res) => {
        setOscIsAlive(res);
        setPinging(false);
        try {
          pinger.rcv.close();
        } catch (error) {
          if ((error as { code: string }).code == "ERR_SOCKET_DGRAM_NOT_RUNNING") {
            // ignoring error if already closed
          } else {
            throw error;
          }
        }
      })
      .catch(ignoreAbortError);

    return () => pinger.abort();
  }, []);

  return { pinging, oscIsAlive };
}

export function useFarragoAppInfo() {
  const [app, setApp] = useState<Application | undefined>();
  const [appExists, setAppExists] = useState(false);
  const [appChecked, setAppChecked] = useState(false);

  const [appIsRunning, setAppIsRunning] = useState(false);
  const [appIsRunningChecked, setAppIsRunningChecked] = useState(false);

  const [appDataDirFound, setAppDataDirFound] = useState(false);
  const [appDataDirChecked, setAppDataDirChecked] = useState(false);

  const { pinging, oscIsAlive } = useOscPing();

  const loading = !appChecked || !appIsRunningChecked || !appDataDirChecked || pinging;

  useEffect(() => {
    findFarrago().then((app) => {
      setApp(app);
      setAppExists(!!app);
      setAppChecked(true);
    });

    isFarragoRunning().then((isRunning) => {
      setAppIsRunning(isRunning);
      setAppIsRunningChecked(true);
    });

    farragoDataDirExists().then((dirExists) => {
      setAppDataDirFound(dirExists);
      setAppDataDirChecked(true);
    });
  }, []);

  return {
    loading,
    app,
    appExists,
    appIsRunning,
    appDataDirFound,
    oscIsAlive,
  };
}

export function useFarragoAppInfoContext() {
  const context = useContext(FarragoAppInfoContext);
  if (!context) throw new Error("useFarragoAppInfoContext must be used within FarragoAppInfoProvider");
  return context;
}

// * HOC

export function withFarragoRunning<P extends LaunchProps>(
  Command: FC<P>,
  opts: { LoadingComponent: FC<{ isLoading: boolean }> },
) {
  if (environment.commandMode !== "view") return Command; // this is only meant for view commands

  return (props: P) => (
    <FarragoAppInfoProvider>
      <FarragoChecker {...props} Command={Command} LoadingComponent={opts.LoadingComponent} />
    </FarragoAppInfoProvider>
  );
}

function FarragoChecker<P extends LaunchProps>(
  props: P & { Command: FC<P>; LoadingComponent: FC<{ isLoading: boolean }> },
) {
  const { loading, appExists, appIsRunning, appDataDirFound, oscIsAlive } = useFarragoAppInfoContext();

  if (loading) return <props.LoadingComponent isLoading={true} />;

  if (!appExists)
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Red }}
          title="Farrago Not Found"
          description="Install Farrago to use this extension."
          actions={
            <ActionPanel>
              <Action
                title="Get Farrago"
                icon={Icon.Globe}
                onAction={async () => {
                  await open(GET_FARRAGO_URL);
                  await popToRoot();
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );

  if (!appIsRunning)
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={{ source: Icon.AppWindow, tintColor: Color.Red }}
          title="Farrago Not Running"
          description="Open Farrago to use this extension."
          actions={
            <ActionPanel>
              <Action
                title="Launch Farrago"
                icon={Icon.AppWindow}
                onAction={async () => {
                  await launchFarrago();
                  await popToRoot();
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );

  if (!oscIsAlive)
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={{ source: Icon.Plug, tintColor: Color.Red }}
          title="OSC Connection Not Established"
          description="Set up OSC in Farrago to use this extension."
          actions={
            <ActionPanel>
              <Action
                title="See Instructions"
                icon={Icon.Book}
                onAction={async () => {
                  await open(OSC_SETUP_INSTRUCTIONS_URL);
                  await popToRoot();
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );

  if (!appDataDirFound)
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={{ source: Icon.Folder, tintColor: Color.Red }}
          title="Farrago Directory Not Found"
          description={`No folder found at "${getPreferences().farragoDataDir}". Ensure correct path is specified.`}
          actions={
            <ActionPanel>
              <Action
                title="Open Settings"
                icon={Icon.Cog}
                onAction={async () => {
                  await openExtensionPreferences();
                  await popToRoot();
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );

  return <props.Command {...props} />;
}

// * like the HOC above, but for no-view commands

export function withFarragoRunningNoView<P extends LaunchProps>(command: (props: P) => unknown | Promise<unknown>) {
  return async (props: P) => {
    const farragoExists = await checkFarragoExists();
    if (!farragoExists) {
      showToast({
        title: "Farrago App Not Found",
        style: Toast.Style.Failure,
      });
      return;
    }

    const farragoIsRunning = await isFarragoRunning();
    if (!farragoIsRunning) {
      showToast({
        title: "Farrago Not Running",
        style: Toast.Style.Failure,
      });
      return;
    }

    await command(props);
  };
}
