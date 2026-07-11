import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GearsetClient } from "./api";
import { EmptyConfiguration, ErrorView } from "./components/ErrorView";
import { RunJobForm } from "./components/RunJobForm";
import { stateColor, stateIcon } from "./format";
import { getPreferences, parseConfiguredJobs } from "./preferences";
import RunHistory from "./run-history";
import { CiJobState, ConfiguredCiJob } from "./types";

interface JobView {
  job: ConfiguredCiJob;
  state?: CiJobState;
  error?: string;
}

export default function CiJobs() {
  const { push } = useNavigation();
  const preferences = getPreferences();
  const apiToken = preferences.apiToken?.trim() ?? "";
  const [jobs, setJobs] = useState<JobView[]>([]);
  const [isLoading, setLoading] = useState(false);
  const configuration = useMemo((): { jobs: ConfiguredCiJob[]; error?: unknown } => {
    try {
      return { jobs: parseConfiguredJobs(preferences.ciJobs) };
    } catch (parseError) {
      return { jobs: [], error: parseError };
    }
  }, [preferences.ciJobs]);
  const configuredJobs = configuration.jobs;

  const load = useCallback(async () => {
    if (!apiToken || !configuredJobs.length) return;
    setLoading(true);
    const client = new GearsetClient(apiToken);
    const views = await Promise.all(
      configuredJobs.map(async (job): Promise<JobView> => {
        try {
          const status = await client.getCiJobStatus(job.id);
          return { job, state: status.State };
        } catch (jobError) {
          return { job, error: jobError instanceof Error ? jobError.message : String(jobError) };
        }
      }),
    );
    setJobs(views);
    setLoading(false);
  }, [apiToken, configuredJobs]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!apiToken) return <EmptyConfiguration kind="automation-token" />;
  if (configuration.error)
    return <ErrorView title="Invalid Gearset configuration" error={configuration.error} onRetry={load} />;
  if (!configuredJobs.length) return <EmptyConfiguration kind="jobs" />;

  const cancelJob = async (view: JobView) => {
    const confirmed = await confirmAlert({
      title: `Cancel ${view.job.name}?`,
      message: "Gearset will stop the currently running CI job if one exists.",
      primaryAction: { title: "Cancel CI Job", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Cancelling Gearset CI job…" });
    try {
      await new GearsetClient(apiToken).cancelCiJob(view.job.id);
      toast.style = Toast.Style.Success;
      toast.title = "Cancel request accepted";
      await load();
    } catch (cancelError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not cancel the CI job";
      toast.message = cancelError instanceof Error ? cancelError.message : String(cancelError);
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search configured Gearset CI jobs…">
      {jobs.map((view) => (
        <List.Item
          key={view.job.id}
          icon={{ source: stateIcon(view.state), tintColor: view.error ? Color.Red : stateColor(view.state) }}
          title={view.job.name}
          subtitle={view.error ?? "Configured Gearset CI job"}
          accessories={[
            {
              tag: {
                value: view.job.environment === "production" ? "PRODUCTION" : "SANDBOX",
                color: view.job.environment === "production" ? Color.Red : Color.Blue,
              },
            },
            { tag: { value: view.state ?? "Unavailable", color: view.error ? Color.Red : stateColor(view.state) } },
          ]}
          actions={
            <ActionPanel>
              <Action title="Request CI Run" icon={Icon.Play} onAction={() => push(<RunJobForm job={view.job} />)} />
              <Action title="Refresh Status" icon={Icon.ArrowClockwise} onAction={load} />
              {view.state === "Running" ? (
                <Action
                  title="Cancel Running Job"
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  onAction={() => cancelJob(view)}
                />
              ) : null}
              <Action title="Open Run History" icon={Icon.Clock} onAction={() => push(<RunHistory />)} />
              <Action.OpenInBrowser
                title="Open Gearset CI Dashboard"
                url="https://app.gearset.com/continuous-integration"
                icon={Icon.Globe}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && !jobs.length ? <List.EmptyView title="No Gearset CI jobs" /> : null}
    </List>
  );
}
