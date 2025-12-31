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
import { exec } from "child_process";
import { useState, useEffect } from "react";
import CronActions from "./components/CronActions";
import CronForm from "./components/CronForm";
import JobLogs from "./components/JobLogs";
import { CronJob, Log } from "./types";
import { getNextRun, explainCron } from "./utils/cronUtils";
import { readCrontab, writeCrontab } from "./utils/crontabSync";

export default function Command() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function load() {
      try {
        const systemJobs = await readCrontab();
        setJobs(systemJobs);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to read Crontab", String(error));
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const saveToSystem = async (newJobs: CronJob[]) => {
    try {
      await writeCrontab(newJobs);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to write Crontab", String(error));
    }
  };

  const handleUpdateJob = (job: CronJob) => {
    setJobs((prev) => {
      const exists = prev.find((j) => j.id === job.id);
      let newJobs;
      if (exists) {
        newJobs = prev.map((j) => (j.id === job.id ? job : j));
      } else {
        newJobs = [...prev, job];
      }
      saveToSystem(newJobs);
      return newJobs;
    });
    showToast(Toast.Style.Success, "Job Saved", `${job.name} has been saved.`);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (
      await confirmAlert({
        title: "Delete Job?",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setJobs((prev) => {
        const newJobs = prev.filter((j) => j.id !== jobId);
        saveToSystem(newJobs);
        return newJobs;
      });
      showToast(Toast.Style.Success, "Job Deleted");
    }
  };

  const handleToggleStatus = (job: CronJob) => {
    const newStatus = job.status === "active" ? "paused" : "active";
    handleUpdateJob({ ...job, status: newStatus });
  };

  const runJob = async (job: CronJob) => {
    showToast(Toast.Style.Animated, "Running Job", job.command);

    // Add pending log?

    exec(job.command, (error, stdout, stderr) => {
      const time = new Date().toLocaleTimeString();
      if (error) {
        const errorLog: Log = {
          id: Date.now(),
          jobId: job.id,
          time,
          message: stderr || error.message,
          type: "error",
        };
        setLogs((prev) => [errorLog, ...prev]);
        showToast(Toast.Style.Failure, "Job Failed", error.message);
      } else {
        const successLog: Log = {
          id: Date.now(),
          jobId: job.id,
          time,
          message: stdout || "Command executed successfully (no output)",
          type: "success",
        };
        setLogs((prev) => [successLog, ...prev]);
        showToast(Toast.Style.Success, "Job Completed");

        // Update last run
        handleUpdateJob({ ...job, lastRun: "Just now", status: "active" }); // Reset failed status if it was failed?
      }
    });
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
