import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import {
  checkPlexAuthPin,
  clearManagedConfiguration,
  createPlexAuthPin,
  discoverPlexServers,
  getMusicSections,
  getPlexSetupStatus,
  resolveSelectedLibrary,
  saveManagedAuthToken,
  saveSelectedLibrary,
  saveSelectedServer,
} from "./plex";
import { PreferencesAction } from "./shared-ui";
import type {
  LibrarySection,
  PlexAuthPin,
  PlexServerResource,
  PlexSetupStatus,
} from "./types";

type SetupStage =
  | "loading"
  | "auth"
  | "waiting-auth"
  | "server"
  | "library"
  | "plexamp";

interface PlexSetupViewProps {
  navigationTitle: string;
  problem?: string;
  onConfigured?: () => void;
}

interface SetupState {
  isLoading: boolean;
  stage: SetupStage;
  status?: PlexSetupStatus;
  servers: PlexServerResource[];
  libraries: LibrarySection[];
  problem?: string;
}

function visibleProblem(problem?: string): string | undefined {
  return problem === "Sign in to Plex to continue." ? undefined : problem;
}

function setupDescription(status?: PlexSetupStatus, problem?: string): string {
  const details = [
    "Choose a discovered Plex Media Server after sign-in.",
    "Choose a music library if Plex exposes more than one.",
    `Plexamp defaults to ${status?.plexampUrl ?? "http://127.0.0.1:32500"} and can be overridden in extension settings.`,
  ];

  return [problem, ...details].filter(Boolean).join("\n\n");
}

function serverAccessories(server: PlexServerResource): List.Item.Accessory[] {
  return [
    ...(server.owned ? [{ tag: { value: "Owned", color: Color.Green } }] : []),
    ...(server.preferredConnection?.local
      ? [{ tag: { value: "Local", color: Color.Blue } }]
      : []),
    ...(server.sourceTitle
      ? [{ text: server.sourceTitle, tooltip: "Shared By" }]
      : []),
  ];
}

export function PlexSetupView(props: PlexSetupViewProps) {
  const [authPin, setAuthPin] = useState<PlexAuthPin>();
  const [state, setState] = useState<SetupState>({
    isLoading: true,
    stage: "loading",
    servers: [],
    libraries: [],
    problem: props.problem,
  });

  const reload = useCallback(async () => {
    setState((current) => ({
      ...current,
      isLoading: true,
      problem: props.problem,
    }));

    try {
      let status = await getPlexSetupStatus();

      if (!status.hasEffectiveToken) {
        setState({
          isLoading: false,
          stage: authPin ? "waiting-auth" : "auth",
          status,
          servers: [],
          libraries: [],
          problem: props.problem,
        });
        return;
      }

      if (!status.hasEffectiveServer) {
        const servers = await discoverPlexServers();

        if (servers.length === 1) {
          await saveSelectedServer(servers[0]);
          status = await getPlexSetupStatus();
        } else {
          setState({
            isLoading: false,
            stage: "server",
            status,
            servers,
            libraries: [],
            problem: props.problem,
          });
          return;
        }
      }

      const libraries = await getMusicSections();
      const selectedLibrary = await resolveSelectedLibrary(libraries);

      if (!selectedLibrary) {
        if (libraries.length === 1) {
          await saveSelectedLibrary(libraries[0]);
          props.onConfigured?.();
          setState({
            isLoading: true,
            stage: "loading",
            status: await getPlexSetupStatus(),
            servers: [],
            libraries: [],
            problem: undefined,
          });
          return;
        }

        setState({
          isLoading: false,
          stage: "library",
          status,
          servers: [],
          libraries,
          problem: props.problem,
        });
        return;
      }

      props.onConfigured?.();
      setState({
        isLoading: true,
        stage: "loading",
        status,
        servers: [],
        libraries: [],
        problem: undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = await getPlexSetupStatus();
      const nextStage =
        !status.hasEffectiveToken || message.includes("401")
          ? "auth"
          : "plexamp";

      setState({
        isLoading: false,
        stage: nextStage,
        status,
        servers: [],
        libraries: [],
        problem: message,
      });
    }
  }, [authPin, props.onConfigured, props.problem]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!authPin) {
      return;
    }

    let cancelled = false;
    let isPolling = false;
    const startedAt = Date.now();
    const expiryMs = (authPin.expiresIn ?? 300) * 1000;

    const interval = setInterval(() => {
      if (cancelled || isPolling) {
        return;
      }

      if (Date.now() - startedAt >= expiryMs) {
        cancelled = true;
        setAuthPin(undefined);
        setState((current) => ({
          ...current,
          stage: "auth",
          problem:
            "The Plex sign-in session expired before it completed. Start the sign-in again.",
        }));
        clearInterval(interval);
        return;
      }

      isPolling = true;
      void checkPlexAuthPin(authPin)
        .then(async (authToken) => {
          if (!authToken || cancelled) {
            return;
          }

          cancelled = true;
          clearInterval(interval);
          await saveManagedAuthToken(authToken);
          setAuthPin(undefined);
          await showToast({
            style: Toast.Style.Success,
            title: "Signed in to Plex",
          });
          await reload();
        })
        .catch((error) => {
          if (!cancelled) {
            setState((current) => ({
              ...current,
              stage: "auth",
              problem: error instanceof Error ? error.message : String(error),
            }));
            setAuthPin(undefined);
            clearInterval(interval);
          }
        })
        .finally(() => {
          isPolling = false;
        });
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [authPin, reload]);

  const startSignIn = useCallback(async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting Plex sign-in...",
    });

    try {
      const pin = await createPlexAuthPin();
      setAuthPin(pin);
      setState((current) => ({
        ...current,
        stage: "waiting-auth",
        problem: undefined,
      }));
      await open(pin.authUrl);
      toast.style = Toast.Style.Success;
      toast.title = "Finish Plex sign-in in your browser";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not start Plex sign-in";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }, []);

  const resetSetup = useCallback(async () => {
    await clearManagedConfiguration();
    setAuthPin(undefined);
    await reload();
  }, [reload]);

  const chooseServer = useCallback(
    async (server: PlexServerResource) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Saving ${server.name}...`,
      });

      try {
        await saveSelectedServer(server);
        toast.style = Toast.Style.Success;
        toast.title = `${server.name} selected`;
        await reload();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not save Plex server";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    [reload],
  );

  const chooseLibrary = useCallback(
    async (library: LibrarySection) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Saving ${library.title}...`,
      });

      try {
        await saveSelectedLibrary(library);
        toast.style = Toast.Style.Success;
        toast.title = `${library.title} selected`;
        await reload();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not save music library";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    [reload],
  );

  if (state.stage === "server") {
    return (
      <List
        isLoading={state.isLoading}
        navigationTitle={props.navigationTitle}
        searchBarPlaceholder="Choose a Plex Media Server"
      >
        {state.servers.length === 0 ? (
          <List.EmptyView
            icon={Icon.Network}
            title="No Plex Servers Found"
            description={setupDescription(state.status, state.problem)}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh Servers"
                  icon={Icon.ArrowClockwise}
                  onAction={() => void reload()}
                />
                <Action
                  title="Sign in Again"
                  icon={Icon.Person}
                  onAction={() => void startSignIn()}
                />
                <PreferencesAction />
              </ActionPanel>
            }
          />
        ) : null}
        {state.servers.map((server) => (
          <List.Item
            key={server.clientIdentifier}
            icon={Icon.Network}
            title={server.name}
            subtitle={server.preferredConnection?.uri}
            accessories={serverAccessories(server)}
            actions={
              <ActionPanel>
                <Action
                  title="Use This Server"
                  icon={Icon.CheckCircle}
                  onAction={() => void chooseServer(server)}
                />
                <Action
                  title="Refresh Servers"
                  icon={Icon.ArrowClockwise}
                  onAction={() => void reload()}
                />
                <Action
                  title="Reset Sign-In"
                  icon={Icon.Trash}
                  onAction={() => void resetSetup()}
                />
                <PreferencesAction />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  if (state.stage === "library") {
    return (
      <List
        isLoading={state.isLoading}
        navigationTitle={props.navigationTitle}
        searchBarPlaceholder="Choose a Plex music library"
      >
        {state.libraries.map((library) => (
          <List.Item
            key={library.key}
            icon={Icon.Music}
            title={library.title}
            accessories={
              library.totalSize !== undefined
                ? [{ text: `${library.totalSize} artists` }]
                : []
            }
            actions={
              <ActionPanel>
                <Action
                  title="Use This Library"
                  icon={Icon.CheckCircle}
                  onAction={() => void chooseLibrary(library)}
                />
                <Action
                  title="Refresh Libraries"
                  icon={Icon.ArrowClockwise}
                  onAction={() => void reload()}
                />
                <Action
                  title="Reset Setup"
                  icon={Icon.Trash}
                  onAction={() => void resetSetup()}
                />
                <PreferencesAction />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  const title =
    state.stage === "waiting-auth" || state.stage === "auth"
      ? "Sign in to Plex"
      : state.stage === "plexamp"
        ? "Check Plexamp Connection"
        : "Sign in to Plex";
  const description =
    state.stage === "waiting-auth" || state.stage === "auth"
      ? [visibleProblem(state.problem), "Press return to sign in to Plex"]
          .filter(Boolean)
          .join("\n\n")
      : setupDescription(state.status, visibleProblem(state.problem));

  return (
    <List isLoading={state.isLoading} navigationTitle={props.navigationTitle}>
      <List.EmptyView
        icon={state.stage === "plexamp" ? Icon.Warning : Icon.Person}
        title={title}
        description={description}
        actions={
          <ActionPanel>
            {state.stage !== "waiting-auth" ? (
              <Action
                title="Sign in to Plex"
                icon={Icon.Person}
                onAction={() => void startSignIn()}
              />
            ) : (
              <Action
                title="Sign in to Plex"
                icon={Icon.Globe}
                onAction={() => authPin && void open(authPin.authUrl)}
              />
            )}
            <Action
              title="Refresh Setup"
              icon={Icon.ArrowClockwise}
              onAction={() => void reload()}
            />
            <Action
              title="Reset Saved Setup"
              icon={Icon.Trash}
              onAction={() => void resetSetup()}
            />
            <PreferencesAction />
          </ActionPanel>
        }
      />
    </List>
  );
}
