import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  Image,
  LaunchType,
  List,
  Toast,
  captureException,
  launchCommand,
  open,
  popToRoot,
  showToast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { FC, useEffect } from "react";

import {
  IvpnCliNotFoundError,
  IvpnFreeTrialExpiredError,
  IvpnNotLoggedInError,
  IvpnPingAlreadyInProgressError,
  IvpnSubscriptionExpiredError,
} from "@/api/ivpn/errors";

import { checkIvpnAppExists } from "./appHelpers";
import { IVPN_PAYMENT_URL } from "./constants";

export function handleError(
  error?: unknown,
  retry?: RetryFnType,
): { showErrorToast?: () => Promise<Toast>; ErrorComponent?: FC } {
  if (!error) return {};

  if (error instanceof IvpnCliNotFoundError) {
    return {
      showErrorToast: async () => {
        const appExists = await checkIvpnAppExists();

        if (!appExists)
          return await showFailureToast(error, {
            title: "IVPN App Not Found",
            message: "Install it to use this extension.",
            primaryAction: { title: "Get IVPN", onAction: () => open(GET_IVPN_URL) },
          });

        return await showFailureToast(error, {
          title: "IVPN CLI Executable Not Found",
          message: "This is unexpected, since you have the app installed.",
          primaryAction: { title: "Research Issue", onAction: () => open(RESEARCH_CLI_NOT_FOUND_ISSUE) },
        });
      },
      ErrorComponent: () => {
        const { data: appExists, isLoading: isCheckingAppExists } = usePromise(checkIvpnAppExists);

        if (isCheckingAppExists) return <Detail isLoading />;

        if (!appExists) {
          return (
            <GenericErrorComponent
              error={error}
              icon={Icon.AppWindow}
              title="IVPN APP Not Found"
              description="Install it to use this extension."
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    // eslint-disable-next-line
                    title="Get IVPN"
                    icon={Icon.Globe}
                    url={GET_IVPN_URL}
                    onOpen={() => popToRoot()}
                  />
                </ActionPanel>
              }
            />
          );
        }

        return (
          <GenericErrorComponent
            error={error}
            icon={Icon.Terminal}
            title="IVPN CLI Executable Not Found"
            description={"This is unexpected, since you have the app installed.\nSee actions for suggestions (⌘K)."}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Research Issue"
                  icon={Icon.MagnifyingGlass}
                  url={RESEARCH_CLI_NOT_FOUND_ISSUE}
                />
                <Action.Open
                  // eslint-disable-next-line
                  title="Contact IVPN Support"
                  icon={Icon.Envelope}
                  target="mailto:support@ivpn.net"
                />
                <Action
                  title="Quit Raycast"
                  icon={Icon.Power}
                  style={Action.Style.Destructive}
                  onAction={() => {
                    // raycast://extensions/raycast/raycast/quit-raycast
                    launchCommand({
                      ownerOrAuthorName: "raycast",
                      extensionName: "raycast",
                      name: "quit-raycast",
                      type: LaunchType.UserInitiated,
                    });
                  }}
                />
                <Action
                  title="Restart System"
                  icon={Icon.Power}
                  style={Action.Style.Destructive}
                  onAction={() => {
                    // raycast://extensions/raycast/system/restart
                    launchCommand({
                      ownerOrAuthorName: "raycast",
                      extensionName: "system",
                      name: "restart",
                      type: LaunchType.UserInitiated,
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        );
      },
    };
  }

  if (error instanceof IvpnNotLoggedInError) {
    return {
      showErrorToast: async () =>
        await showFailureToast(error, {
          title: "Not logged into IVPN",
          message: "Please log in to run this command.",
        }),
      ErrorComponent: () => (
        <GenericErrorComponent
          error={error}
          title="Not Authenticated"
          description="Log into IVPN to run this command."
          icon={Icon.XMarkCircle}
          actions={
            <ActionPanel>
              <Action title="Reload" icon={Icon.RotateAntiClockwise} onAction={retry} />
              <Action.OpenInBrowser
                // eslint-disable-next-line
                title="Visit IVPN Website"
                icon={Icon.Globe}
                url="https://ivpn.net"
              />
            </ActionPanel>
          }
        />
      ),
    };
  }

  if (error instanceof IvpnPingAlreadyInProgressError) {
    return {
      showErrorToast: () =>
        showToast({
          title: "Ping already in progress",
          message: "Try again later",
          style: Toast.Style.Failure,
          primaryAction: { title: "Retry", onAction: () => retry?.() },
          secondaryAction: { title: "Copy Logs", onAction: () => Clipboard.copy(error.stack ?? String(error)) },
        }),
      ErrorComponent: () => (
        <GenericErrorComponent error={error} icon={Icon.Bug} title="Something went wrong" retry={retry} />
      ),
    };
  }

  if (error instanceof IvpnSubscriptionExpiredError) {
    return {
      showErrorToast: () =>
        showToast({
          title: "Subscription Expired",
          message: "Extend your IVPN account.",
          style: Toast.Style.Failure,
          primaryAction: { title: "Extend Account", onAction: () => open(IVPN_PAYMENT_URL) },
          secondaryAction: { title: "Copy Logs", onAction: () => Clipboard.copy(error.stack ?? String(error)) },
        }),
      ErrorComponent: () => (
        <GenericErrorComponent
          error={error}
          icon={Icon.Calendar}
          title="Subscription Expired"
          description="Extend your account to continue using IVPN."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.Wallet} title="Extend Account" url={IVPN_PAYMENT_URL} />
              {retry ? <GenericRetryAction retry={retry!} /> : null}
            </ActionPanel>
          }
        />
      ),
    };
  }

  if (error instanceof IvpnFreeTrialExpiredError) {
    return {
      showErrorToast: () =>
        showToast({
          title: "Free Trial Expired",
          message: "Extend your IVPN account.",
          style: Toast.Style.Failure,
          primaryAction: { title: "Extend Account", onAction: () => open(IVPN_PAYMENT_URL) },
          secondaryAction: { title: "Copy Logs", onAction: () => Clipboard.copy(error.stack ?? String(error)) },
        }),
      ErrorComponent: () => (
        <GenericErrorComponent
          error={error}
          icon={Icon.Calendar}
          title="Free Trial Expired"
          description="Extend your account to continue using IVPN."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.Wallet} title="Extend Account" url={IVPN_PAYMENT_URL} />
              {retry ? <GenericRetryAction retry={retry!} /> : null}
            </ActionPanel>
          }
        />
      ),
    };
  }

  // uncaught exceptions:

  console.error(error);
  captureException(error);

  return {
    showErrorToast: () => showFailureToast(error, { title: "Something went wrong" }),
    ErrorComponent: () => (
      <GenericErrorComponent error={error} icon={Icon.Bug} title="Something went wrong" retry={retry} />
    ),
  };
}

function GenericErrorComponent({
  error,
  icon,
  title,
  description,
  actions,
  retry,
}: Omit<List.EmptyView.Props, "icon"> & { error: unknown; icon?: Image.Source; retry?: RetryFnType }) {
  let actionsEl;
  if (actions) {
    if (retry) console.warn("retry ignored when actions are specified in GenericErrorComponent");
    actionsEl = actions;
  } else if (retry) {
    actionsEl = (
      <ActionPanel>
        <GenericRetryAction retry={retry} />
      </ActionPanel>
    );
  }

  useEffect(() => {
    showFailureToast(error);
  }, []);

  return (
    <List>
      <List.EmptyView
        icon={icon ? { source: icon, tintColor: Color.Red } : null}
        title={title}
        description={description}
        actions={actionsEl}
      />
    </List>
  );
}

function GenericRetryAction({ retry }: { retry: RetryFnType }) {
  return <Action title="Retry" icon={Icon.RotateAntiClockwise} onAction={retry} />;
}

export function withErrorHandler<A extends unknown[], R>(
  fn: (...args: A) => R | Promise<R>,
  errorHandler: (err: unknown) => any | Promise<any>,
) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      await errorHandler(err);
    }
  };
}

export function withNoViewErrorHandler<A extends unknown[], R>(fn: (...args: A) => R) {
  return withErrorHandler(fn, async (err) => {
    const { showErrorToast } = handleError(err);
    await showErrorToast?.();
  });
}

const RESEARCH_CLI_NOT_FOUND_ISSUE = "https://www.google.com/search?q=ivpn%20cli%20not%20found";
const GET_IVPN_URL = "https://www.ivpn.net/en/apps";

type RetryFnType = (() => void) | (() => Promise<void>);
