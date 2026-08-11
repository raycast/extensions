import {
  Action,
  ActionPanel,
  Color,
  Icon,
  LaunchType,
  List,
  Toast,
  launchCommand,
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
  getMusicSectionsForServer,
  getPlexSetupStatus,
  resolveSelectedLibrary,
  saveManagedAuthToken,
  saveSelectedLibrary,
  saveSelectedServer,
} from "./plex";
import { isRequestStatusError } from "./plex-request";
import { PreferencesAction } from "./shared-ui";
import type { LibrarySection, PlexAuthPin, PlexServerResource, PlexSetupStatus } from "./types";

type SetupStage = "loading" | "auth" | "waiting-auth" | "library-selection" | "plexamp";

interface ServerLibraries {
  server: PlexServerResource;
  libraries: LibrarySection[];
  connectionUri: string;
}

interface PlexSetupViewProps {
  navigationTitle: string;
  problem?: string;
  onConfigured?: () => void | Promise<void>;
  forceLibrarySelection?: boolean;
}

interface SetupState {
  isLoading: boolean;
  stage: SetupStage;
  status?: PlexSetupStatus;
  serverLibraries: ServerLibraries[];
  problem?: string;
}

function visibleProblem(problem?: string): string | undefined {
  return problem === "Sign in to Plex to continue." ? undefined : problem;
}

function setupDescription(status?: PlexSetupStatus, problem?: string): string {
  const details = [
    "Choose a Plex music library from the discovered servers after sign-in.",
    `Plexamp defaults to ${status?.plexampUrl ?? "http://127.0.0.1:32500"} and can be overridden in extension settings.`,
  ];

  return [problem, ...details].filter(Boolean).join("\n\n");
}

export function PlexSetupView(props: PlexSetupViewProps) {
  const [authPin, setAuthPin] = useState<PlexAuthPin>();
  const [state, setState] = useState<SetupState>({
    isLoading: true,
    stage: "loading",
    serverLibraries: [],
    problem: props.problem,
  });

  const reload = useCallback(async () => {
    setState((current) => ({
      ...current,
      isLoading: true,
      problem: props.problem,
    }));

    try {
      const status = await getPlexSetupStatus();

      if (!status.hasEffectiveToken) {
        setState({
          isLoading: false,
          stage: authPin ? "waiting-auth" : "auth",
          status,
          serverLibraries: [],
          problem: props.problem,
        });
        return;
      }

      if (props.forceLibrarySelection || !status.hasEffectiveServer) {
        setState({
          isLoading: true,
          stage: "library-selection",
          status,
          serverLibraries: [],
          problem: undefined,
        });

        const servers = await discoverPlexServers();

        // Sort local servers first so they appear sooner
        const sortedServers = [...servers].sort((a, b) => {
          const aLocal = a.preferredConnection?.localNetwork ? 0 : 1;
          const bLocal = b.preferredConnection?.localNetwork ? 0 : 1;
          return aLocal - bLocal;
        });

        // Stream results in as each server resolves, preserving sort order
        const results: (ServerLibraries | null)[] = new Array(sortedServers.length).fill(null);
        let remaining = sortedServers.length;

        await Promise.all(
          sortedServers.map(async (server, index) => {
            try {
              const { libraries, connectionUri } = await getMusicSectionsForServer(server);
              if (libraries.length > 0) {
                results[index] = { server, libraries, connectionUri };
                setState((current) => ({
                  ...current,
                  isLoading: remaining > 1,
                  serverLibraries: results.filter((r): r is ServerLibraries => r !== null),
                }));
              }
            } catch {
              // Server unreachable or has no music — skip
            } finally {
              remaining--;
            }
          }),
        );

        const serverLibraries = results.filter((r): r is ServerLibraries => r !== null);
        const selectableLibraries = serverLibraries.flatMap((entry) =>
          entry.libraries.map((library) => ({ server: entry.server, library, connectionUri: entry.connectionUri })),
        );

        if (!props.forceLibrarySelection && selectableLibraries.length === 1) {
          await saveSelectedServer(selectableLibraries[0].server, selectableLibraries[0].connectionUri);
          await saveSelectedLibrary(selectableLibraries[0].library);
          await props.onConfigured?.();
          setState({
            isLoading: true,
            stage: "loading",
            status: await getPlexSetupStatus(),
            serverLibraries: [],
            problem: undefined,
          });
          return;
        }

        setState({
          isLoading: false,
          stage: "library-selection",
          status,
          serverLibraries,
          problem: props.problem,
        });
        return;
      }

      setState({
        isLoading: true,
        stage: "library-selection",
        status,
        serverLibraries: [],
        problem: undefined,
      });

      const libraries = await getMusicSections();
      const selectedLibrary = await resolveSelectedLibrary(libraries);

      if (!selectedLibrary) {
        if (libraries.length === 1) {
          await saveSelectedLibrary(libraries[0]);
          await props.onConfigured?.();
          setState({
            isLoading: true,
            stage: "loading",
            status: await getPlexSetupStatus(),
            serverLibraries: [],
            problem: undefined,
          });
          return;
        }

        setState({
          isLoading: false,
          stage: "library-selection",
          status,
          serverLibraries: status.hasEffectiveServer
            ? [
                {
                  server: {
                    name: status.selectedServerName ?? "Selected Plex Server",
                    clientIdentifier: "selected-server",
                    owned: true,
                    connections: [],
                  },
                  libraries,
                  connectionUri: "",
                },
              ]
            : [],
          problem: props.problem,
        });
        return;
      }

      await props.onConfigured?.();
      setState({
        isLoading: true,
        stage: "loading",
        status,
        serverLibraries: [],
        problem: undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = await getPlexSetupStatus();
      const nextStage = !status.hasEffectiveToken || isRequestStatusError(error, 401) ? "auth" : "plexamp";

      setState({
        isLoading: false,
        stage: nextStage,
        status,
        serverLibraries: [],
        problem: message,
      });
    }
  }, [authPin, props.forceLibrarySelection, props.onConfigured, props.problem]);

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
          problem: "The Plex sign-in session expired before it completed. Start the sign-in again.",
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
          try {
            await launchCommand({
              name: "change-plex-library",
              type: LaunchType.UserInitiated,
            });
          } catch {
            await reload();
          }
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

  const chooseLibrary = useCallback(
    async (library: LibrarySection, server?: PlexServerResource, connectionUri?: string) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Saving ${library.title}...`,
      });

      try {
        if (server?.connections.length) {
          await saveSelectedServer(server, connectionUri);
        }
        await saveSelectedLibrary(library);
        toast.style = Toast.Style.Success;
        toast.title = `${library.title} selected`;

        if (props.onConfigured) {
          await props.onConfigured();
        } else {
          await reload();
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not save music library";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    [props.onConfigured, reload],
  );

  if (state.stage === "library-selection") {
    return (
      <List
        isLoading={state.isLoading}
        navigationTitle={props.navigationTitle}
        searchBarPlaceholder="Choose a Plex music library"
      >
        {state.isLoading && state.serverLibraries.length === 0 ? (
          <List.EmptyView icon={Icon.MagnifyingGlass} title="Searching for libraries, please wait" />
        ) : state.serverLibraries.length === 0 ? (
          <List.EmptyView
            icon={Icon.Network}
            title="No Plex Libraries Found"
            description={setupDescription(state.status, state.problem)}
            actions={
              <ActionPanel>
                <Action title="Refresh Libraries" icon={Icon.ArrowClockwise} onAction={() => void reload()} />
                <Action title="Sign in Again" icon={Icon.Person} onAction={() => void startSignIn()} />
                <PreferencesAction />
              </ActionPanel>
            }
          />
        ) : null}
        {state.serverLibraries.map(({ server, libraries, connectionUri }) => (
          <List.Section key={server.clientIdentifier} title={server.name} subtitle={connectionUri}>
            {libraries.map((library) => (
              <List.Item
                key={`${server.clientIdentifier}:${library.key}`}
                icon={Icon.Music}
                title={library.title}
                accessories={[
                  ...(state.status?.selectedLibrary === library.key
                    ? [
                        {
                          icon: {
                            source: Icon.CheckCircle,
                            tintColor: Color.Green,
                          },
                        },
                      ]
                    : []),
                  ...(library.totalSize !== undefined ? [{ text: `${library.totalSize} artists` }] : []),
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Use This Library"
                      icon={Icon.CheckCircle}
                      onAction={() => void chooseLibrary(library, server, connectionUri)}
                    />
                    <Action title="Refresh Libraries" icon={Icon.ArrowClockwise} onAction={() => void reload()} />
                    <Action title="Reset Setup" icon={Icon.Trash} onAction={() => void resetSetup()} />
                    <PreferencesAction />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
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
      ? [visibleProblem(state.problem), "Press return to sign in to Plex"].filter(Boolean).join("\n\n")
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
              <Action title="Sign in to Plex" icon={Icon.Person} onAction={() => void startSignIn()} />
            ) : (
              <Action
                title="Sign in to Plex"
                icon={Icon.Globe}
                onAction={() => authPin && void open(authPin.authUrl)}
              />
            )}
            <Action title="Refresh Setup" icon={Icon.ArrowClockwise} onAction={() => void reload()} />
            <Action title="Reset Saved Setup" icon={Icon.Trash} onAction={() => void resetSetup()} />
            <PreferencesAction />
          </ActionPanel>
        }
      />
    </List>
  );
}
