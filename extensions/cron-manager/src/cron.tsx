import {
  Action,
  ActionPanel,
  List,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  useNavigation,
} from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { useState, useEffect, useRef, useCallback } from "react";
import CronActions from "./components/CronActions";
import CronForm from "./components/CronForm";
import JobLogs from "./components/JobLogs";
import { CronJob, Log } from "./types";
import { getNextRun, explainCron } from "./utils/cronUtils";
import { readCrontab, writeCrontab, CrontabReadResult } from "./utils/crontabSync";

const execAsync = promisify(exec);

export default function Command() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  // Preserve non-Raycast crontab content across round-trip writes
  const nonManagedRef = useRef<string>("");

  useEffect(() => {
    async function load() {
      try {
        const result: CrontabReadResult = await readCrontab();
        setJobs(result.jobs);
        nonManagedRef.current = result.nonManagedContent;
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to read Crontab", String(error));
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const saveToSystem = useCallback(async (newJobs: CronJob[]) => {
    try {
      await writeCrontab(newJobs, nonManagedRef.current);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to write Crontab", String(error));
    }
  }, []);

  const handleUpdateJob = useCallback(
    async (job: CronJob) => {
      let updatedJobs: CronJob[] = [];
      setJobs((prev) => {
        const exists = prev.find((j) => j.id === job.id);
        updatedJobs = exists ? prev.map((j) => (j.id === job.id ? job : j)) : [...prev, job];
        return updatedJobs;
      });

      // React calls the updater function synchronously, so updatedJobs is
      // guaranteed to be populated here.
      await saveToSystem(updatedJobs);
      showToast(Toast.Style.Success, "Job Saved", `${job.name} has been saved.`);
    },
    [saveToSystem],
  );

  const handleDeleteJob = useCallback(
    async (jobId: string) => {
      if (
        await confirmAlert({
          title: "Delete Job?",
          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
        })
      ) {
        let updatedJobs: CronJob[] = [];
        setJobs((prev) => {
          updatedJobs = prev.filter((j) => j.id !== jobId);
          return updatedJobs;
        });
        await saveToSystem(updatedJobs);
        showToast(Toast.Style.Success, "Job Deleted");
      }
    },
    [saveToSystem],
  );

  const handleToggleStatus = useCallback(
    (job: CronJob) => {
      const newStatus = job.status === "active" ? "paused" : "active";
      handleUpdateJob({ ...job, status: newStatus });
    },
    [handleUpdateJob],
  );

  const runJob = async (job: CronJob) => {
    await showToast(Toast.Style.Animated, "Running Job", job.command);

    try {
      const { stdout } = await execAsync(job.command);
      const time = new Date().toLocaleTimeString();
      const successLog: Log = {
        id: Math.random().toString(36).substring(2, 11),
        jobId: job.id,
        time,
        message: stdout || "Command executed successfully (no output)",
        type: "success",
      };
      setLogs((prev) => [successLog, ...prev]);
      showToast(Toast.Style.Success, "Job Completed");

      // Update last run
      await handleUpdateJob({ ...job, lastRun: "Just now", status: "active" });
    } catch (error) {
      const err = error as { message: string; stderr?: string };
      const time = new Date().toLocaleTimeString();
      const errorLog: Log = {
        id: Math.random().toString(36).substring(2, 11),
        jobId: job.id,
        time,
        message: err.stderr || err.message,
        type: "error",
      };
      setLogs((prev) => [errorLog, ...prev]);
      showToast(Toast.Style.Failure, "Job Failed", err.message);
    }
  };

  const getStatusIcon = (status: CronJob["status"]) => {
    switch (status) {
      case "active":
        return { source: Icon.CircleFilled, tintColor: Color.Green };
      case "paused":
        return { source: Icon.CircleFilled, tintColor: Color.Yellow };
      case "failed":
        return { source: Icon.CircleFilled, tintColor: Color.Red };
      default:
        return Icon.Circle;
    }
  };

  return (
    <List isShowingDetail isLoading={isLoading}>
      {jobs.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Cron Jobs"
          description="Create your first cron job to get started."
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Job"
                icon={Icon.Plus}
                target={<CronForm onSave={handleUpdateJob} />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        jobs.map((job) => (
          <List.Item
            key={job.id}
            title={job.name}
            icon={getStatusIcon(job.status)}
            keywords={[job.command]}
            accessories={[{ text: getNextRun(job.schedule) }]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Name" text={job.name} />
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={job.status.toUpperCase()}
                        color={
                          job.status === "active" ? Color.Green : job.status === "paused" ? Color.Yellow : Color.Red
                        }
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="Schedule" text={job.schedule} />
                    <List.Item.Detail.Metadata.Label title="Human Readable" text={explainCron(job.schedule)} />
                    <List.Item.Detail.Metadata.Label title="Command" text={job.command} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Last Run" text={job.lastRun || "Never"} />
                    <List.Item.Detail.Metadata.Label title="Next Run" text={getNextRun(job.schedule)} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Recent Logs" />
                    {logs
                      .filter((l) => l.jobId === job.id)
                      .slice(0, 5)
                      .map((log) => (
                        <List.Item.Detail.Metadata.Label
                          key={log.id}
                          title={log.time}
                          text={log.message}
                          icon={
                            log.type === "error"
                              ? { source: Icon.XMarkCircle, tintColor: Color.Red }
                              : { source: Icon.CheckCircle, tintColor: Color.Green }
                          }
                        />
                      ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <CronActions
                job={job}
                onUpdate={handleUpdateJob}
                onDelete={handleDeleteJob}
                onRun={runJob}
                onToggle={handleToggleStatus}
                onViewLogs={() => push(<JobLogs job={job} logs={logs.filter((l) => l.jobId === job.id)} />)}
              />
            }
          />
        ))
      )}
    </List>
  );
}
