import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  useUpcomingLaunches,
  refreshLaunchesCache,
  useApiThrottleInfo,
  formatTimeRemaining,
  RateLimitError,
  isDevelopment,
} from "./lib/api";
import { formatRelativeTime } from "./lib/utils";
import LaunchDetails from "./components/LaunchDetails";
import { Launch } from "./lib/types";

// Type guard to check if error is our rate limit error
function isRateLimitError(error: unknown): error is RateLimitError {
  return (
    error instanceof RateLimitError ||
    Boolean(error && typeof error === "object" && "isRateLimitError" in error && "next_use_secs" in error)
  );
}

// Helper function to extract next_use_secs from any rate limit error
function getNextUseSecs(error: unknown): number {
  if (!error) return 0;

  if (error instanceof RateLimitError) {
    return error.next_use_secs;
  }

  if (typeof error === "object" && error !== null && "next_use_secs" in error) {
    const nextUseSecs = error.next_use_secs;
    return typeof nextUseSecs === "number" ? nextUseSecs : 0;
  }

  return 0;
}

// Helper function to get a readable error message from any error type
function getErrorMessage(error: unknown): string {
  if (!error) return "Unknown error occurred";

  if (isRateLimitError(error)) {
    if (error instanceof RateLimitError) {
      return error.message;
    }
    if (typeof error === "object" && error !== null && "message" in error) {
      return String(error["message"] || "Rate limit exceeded. Try again later.");
    }
    return "Rate limit exceeded. Try again later.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return "An error object occurred that couldn't be displayed";
    }
  }

  return String(error);
}

export default function Command() {
  const {
    data: launches,
    isLoading: isLoadingLaunches,
    error: launchesError,
    revalidate: revalidateLaunches,
  } = useUpcomingLaunches();
  const { data: throttleInfo, revalidate: revalidateThrottle } = useApiThrottleInfo();

  // State to track remaining time until next API request
  const [nextUseSecsRemaining, setNextUseSecsRemaining] = useState<number | null>(null);
  // Flag to track if we're rate limited
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
  // Store the rate limit error message
  const [rateLimitMessage, setRateLimitMessage] = useState<string>("");
  // Ref to track interval ID for cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Process any rate limit errors or throttle info
  useEffect(() => {
    // Check if the error is a rate limit error
    if (launchesError && isRateLimitError(launchesError)) {
      console.log("Detected rate limit error:", launchesError);
      setIsRateLimited(true);
      setRateLimitMessage(getErrorMessage(launchesError));
      setNextUseSecsRemaining(getNextUseSecs(launchesError));
    } else if (launchesError) {
      setIsRateLimited(false);
    } else {
      // Only clear rate limit if there's no error
      if (!isRateLimited) {
        setRateLimitMessage("");
      }
    }
  }, [launchesError]);

  // Effect to sync nextUseSecsRemaining with throttle info
  useEffect(() => {
    // Update state from throttle info if we don't already have a rate limit error
    if (!isRateLimited && throttleInfo && typeof throttleInfo === "object" && "next_use_secs" in throttleInfo) {
      const nextUseSecs = throttleInfo.next_use_secs;
      if (nextUseSecs > 0) {
        setNextUseSecsRemaining(nextUseSecs);
        setIsRateLimited(true);
        setRateLimitMessage(`Rate limit exceeded. Try again ${formatTimeRemaining(nextUseSecs)}.`);
      }
    }
  }, [throttleInfo, isRateLimited]);

  // Separate effect for countdown timer
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only set up interval if we have a positive countdown value
    if (nextUseSecsRemaining !== null && nextUseSecsRemaining > 0) {
      // Set up countdown interval
      intervalRef.current = setInterval(() => {
        setNextUseSecsRemaining((prevSecs) => {
          if (prevSecs === null || prevSecs <= 1) {
            // Clear interval when we reach 0
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return 0;
          }
          return prevSecs - 1;
        });
      }, 1000);

      // Clean up interval on unmount
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [nextUseSecsRemaining]); // Re-run when nextUseSecsRemaining changes

  // Additional effect to revalidate when timer reaches zero
  useEffect(() => {
    if (nextUseSecsRemaining === 0 && isRateLimited) {
      // When timer reaches zero, clear rate limit state and refresh data
      setIsRateLimited(false);
      setRateLimitMessage("");
      revalidateThrottle();
      revalidateLaunches();
    }
  }, [nextUseSecsRemaining, isRateLimited]);

  const handleRefresh = async () => {
    try {
      // Revalidate throttle info first
      await revalidateThrottle();

      // Check if we're rate limited
      const canRefresh = !(
        throttleInfo &&
        typeof throttleInfo === "object" &&
        "next_use_secs" in throttleInfo &&
        throttleInfo.next_use_secs > 0
      );

      // If we're rate limited and have time remaining, show message and return
      if (!canRefresh) {
        showToast({
          style: Toast.Style.Failure,
          title: "Rate limit reached",
          message: `Next refresh available ${formatTimeRemaining(throttleInfo.next_use_secs)}`,
        });
        setIsRateLimited(true);
        setNextUseSecsRemaining(throttleInfo.next_use_secs);
        setRateLimitMessage(`Rate limit exceeded. Try again ${formatTimeRemaining(throttleInfo.next_use_secs)}.`);
        return;
      }

      // Show loading toast
      showToast({ style: Toast.Style.Animated, title: "Refreshing launches" });

      try {
        // Attempt to refresh cache
        await refreshLaunchesCache();

        // Refresh data in the UI
        await revalidateLaunches();
        await revalidateThrottle();

        // Clear any existing rate limit state
        setIsRateLimited(false);
        setRateLimitMessage("");

        showToast({ style: Toast.Style.Success, title: `Launches refreshed${isDevelopment ? " using dev api" : ""}` });
      } catch (refreshError) {
        console.error("Error during refresh cache:", refreshError);

        // Check for rate limit error
        if (isRateLimitError(refreshError)) {
          const nextUseSecs = getNextUseSecs(refreshError);
          setIsRateLimited(true);
          setNextUseSecsRemaining(nextUseSecs);
          setRateLimitMessage(getErrorMessage(refreshError));

          showToast({
            style: Toast.Style.Failure,
            title: "Rate limit reached",
            message: `Next refresh available ${formatTimeRemaining(nextUseSecs)}`,
          });
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to refresh launches",
            message: getErrorMessage(refreshError),
          });
          // Try to revalidate anyway
          revalidateLaunches();
        }
      }
    } catch (error) {
      // Handle errors more gracefully
      console.error("Error during refresh:", error);

      // Check for rate limit error
      if (isRateLimitError(error)) {
        const nextUseSecs = getNextUseSecs(error);
        setIsRateLimited(true);
        setNextUseSecsRemaining(nextUseSecs);
        setRateLimitMessage(getErrorMessage(error));
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to refresh launches",
          message: getErrorMessage(error),
        });
      }
    }
  };

  const sortedLaunches = useMemo(() => {
    if (!launches) return [];

    // Sort launches by date (closest first)
    return [...launches].sort((a, b) => new Date(a.net).getTime() - new Date(b.net).getTime());
  }, [launches]);

  // Group launches into past and upcoming
  const groupedLaunches = useMemo(() => {
    if (!sortedLaunches) return {};

    type LaunchGroups = {
      [key: string]: Launch[];
    };

    const now = new Date();

    return sortedLaunches.reduce<LaunchGroups>((acc, launch) => {
      const launchDate = new Date(launch.net);
      const group = launchDate < now ? "past" : "upcoming";

      if (!acc[group]) {
        acc[group] = [];
      }

      acc[group].push(launch);
      return acc;
    }, {});
  }, [sortedLaunches]);

  // Display refresh availability in the title or action with real-time countdown
  const getRefreshTitle = (): string => {
    // Use our live countdown timer if it's set
    if (nextUseSecsRemaining !== null && nextUseSecsRemaining > 0) {
      return `Refresh Launches (Available in ${nextUseSecsRemaining}s)`;
    }
    // Fall back to throttle info if our timer isn't set yet
    else if (
      throttleInfo &&
      typeof throttleInfo === "object" &&
      "next_use_secs" in throttleInfo &&
      throttleInfo.next_use_secs > 0
    ) {
      return `Refresh Launches (Available ${formatTimeRemaining(throttleInfo.next_use_secs)})`;
    }
    return "Refresh Launches";
  };

  // Display countdown in list navigation title if rate limited
  const getNavigationTitle = (): string => {
    if (nextUseSecsRemaining !== null && nextUseSecsRemaining > 0) {
      return `Next Launches (Rate Limited - Refresh in ${nextUseSecsRemaining}s)`;
    }
    return "Next Launches";
  };

  // Get real-time error message for rate limit error
  const getRateLimitErrorMessage = (): string => {
    if (nextUseSecsRemaining !== null && nextUseSecsRemaining > 0) {
      return `Rate limit exceeded. Try again in ${nextUseSecsRemaining} seconds.`;
    }
    return rateLimitMessage || "Rate limit exceeded. Try again later.";
  };

  // Format any other error message
  const getRegularErrorMessage = (): string => {
    if (!launchesError) return "Unknown error";
    return getErrorMessage(launchesError);
  };

  // Force a re-render each time nextUseSecsRemaining changes
  const [, forceUpdate] = useState({});
  useEffect(() => {
    forceUpdate({});
  }, [nextUseSecsRemaining]);

  return (
    <List
      isLoading={isLoadingLaunches && !isRateLimited}
      searchBarPlaceholder="Search launches..."
      throttle
      // isShowingDetail
      navigationTitle={getNavigationTitle()}
      actions={
        <ActionPanel>
          <Action
            title={getRefreshTitle()}
            icon={Icon.ArrowClockwise}
            onAction={handleRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {/* Show rate limit status as a section title when active */}
      {nextUseSecsRemaining !== null && nextUseSecsRemaining > 0 && (
        <List.Section title={`API Rate Limited - Next refresh available in ${nextUseSecsRemaining} seconds`} />
      )}

      {/* Show dynamic rate limit error */}
      {isRateLimited && (
        <List.EmptyView
          icon={{ source: Icon.Warning }}
          title="Failed to load launches"
          description={getRateLimitErrorMessage()}
          actions={
            <ActionPanel>
              <Action
                title={
                  nextUseSecsRemaining && nextUseSecsRemaining > 0
                    ? `Try Again (in ${nextUseSecsRemaining}s)`
                    : "Try Again"
                }
                icon={Icon.ArrowClockwise}
                onAction={revalidateLaunches}
              />
            </ActionPanel>
          }
        />
      )}

      {/* Regular error display (non-rate limit) */}
      {launchesError && !isRateLimited && (
        <List.EmptyView
          icon={{ source: Icon.Warning }}
          title="Failed to load launches"
          description={`Error: ${getRegularErrorMessage()}`}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidateLaunches} />
            </ActionPanel>
          }
        />
      )}

      {!isLoadingLaunches && !launchesError && !isRateLimited && sortedLaunches.length === 0 && (
        <List.EmptyView
          icon={{ source: Icon.Warning }}
          title="No launches found"
          description="There are no upcoming launches in our database."
          actions={
            <ActionPanel>
              <Action title={getRefreshTitle()} icon={Icon.ArrowClockwise} onAction={handleRefresh} />
            </ActionPanel>
          }
        />
      )}

      {sortedLaunches.length > 0 &&
        !isRateLimited &&
        Object.entries(groupedLaunches).map(([date, launches]) => (
          <List.Section key={date} title={date}>
            {launches.map((launch: Launch) => (
              <List.Item
                key={`${launch.id}-${nextUseSecsRemaining}`} // Force re-render when timer changes
                id={launch.id}
                // icon={getLaunchStatusIcon(launch.status.name)}
                icon={Icon.Rocket}
                title={launch.name}
                subtitle={formatRelativeTime(launch.net)}
                accessories={[
                  {
                    icon:
                      launch.status.abbrev === "Success"
                        ? Icon.CheckCircle
                        : launch.status.abbrev === "Go"
                          ? Icon.Circle
                          : Icon.XmarkCircle,
                    text: launch.status.abbrev,
                  },
                  // { text: formatLaunchDate(launch.net), tooltip: "Launch Date" },
                  // { text: launch.status.name, icon: getLaunchStatusIcon(launch.status.name) },
                ]}
                // detail={
                //   <List.Item.Detail
                //     metadata={
                //       <List.Item.Detail.Metadata>
                //         <List.Item.Detail.Metadata.Label
                //           title="Status"
                //           text={`${getLaunchStatusIcon(launch.status.name)} ${launch.status.name}`}
                //         />
                //         <List.Item.Detail.Metadata.Label title="Launch Date" text={formatLaunchDate(launch.net)} />
                //         <List.Item.Detail.Metadata.Label title="Rocket" text={launch.rocket.configuration.full_name} />
                //         {launch.mission?.name && (
                //           <List.Item.Detail.Metadata.Label title="Mission" text={launch.mission.name} />
                //         )}
                //         <List.Item.Detail.Metadata.Label title="Launch Site" text={launch.pad.location.name} />
                //         <List.Item.Detail.Metadata.Label title="Country" text={launch.pad.location.country_code} />
                //         {launch.pad.name && <List.Item.Detail.Metadata.Label title="Pad" text={launch.pad.name} />}
                //       </List.Item.Detail.Metadata>
                //     }
                //   />
                // }
                actions={
                  <ActionPanel>
                    <Action.Push title="Show Details" icon={Icon.Sidebar} target={<LaunchDetails launch={launch} />} />
                    <Action
                      title={getRefreshTitle()}
                      icon={Icon.ArrowClockwise}
                      onAction={handleRefresh}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
