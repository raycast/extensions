import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, runAppleScript, showFailureToast, useExec, useForm } from "@raycast/utils";
import cronParser from "cron-parser";
import cronstrue from "cronstrue";
import fs from "fs";
import { useMemo } from "react";

export default function Command() {
  const { data: crontabData, revalidate } = useExec("crontab", ["-l"]);

  const cronJobs = useMemo<CronJob[]>(() => parseCronJobs(crontabData ?? ""), [crontabData]);

  return (
    <List>
      {cronJobs.map((job, index) => (
        <List.Item
          key={index}
          icon={Icon.Clock}
          title={job.name}
          subtitle={job.description}
          actions={
            <ActionPanel>
              <Action.Push title="Show Logs" target={<CronLogs job={job} />} />
              <Action.Push title="Edit Cron Job" target={<CronForm job={job} onSubmit={revalidate} />} />
              <Action.Push title="New Cron Job" target={<CronForm job={{}} onSubmit={revalidate} />} />
              <Action
                title="Delete Cron Job"
                onAction={() => {
                  handleDeleteCronJob(job);
                  revalidate();
                }}
              />
            </ActionPanel>
          }
          accessories={[{ tag: { value: job.parsedCronExpression, color: Color.Blue }, tooltip: "Tag with tooltip" }]}
        />
      ))}
    </List>
  );
}

export function CronLogs({ job }: { job: CronJob }) {
  const { data: user } = useExec("whoami");
  // TODO: Optimize for long mail files
  const { data: logsData } = useExec(`cat`, [`/var/mail/${user}`]);
  const cronMails = useMemo<CronMail[]>(() => {
    if (!logsData) return [];
    const cronMails = parseCronMail(logsData);
    return cronMails
      .filter((mail) => mail.command === job.scriptPath[0])
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [logsData]);

  return (
    <List isShowingDetail navigationTitle={`Logs for ${job.name}`}>
      {cronMails.map((mail, index) => (
        <List.Item
          key={index}
          title={mail.date.toLocaleString()}
          detail={<List.Item.Detail markdown={`# Output\n\n${mail.output}`} />}
        />
      ))}
    </List>
  );
}

export function CronForm({ job, onSubmit }: { job: CronJob | Partial<CronJob>; onSubmit: () => void }) {
  const { handleSubmit, itemProps, values } = useForm<CronJob>({
    onSubmit: async (values) => {
      const cronJobEntry = `
# Name: ${values.name}
# Description: ${values.description}
${values.cronExpression} ${values.scriptPath}
`;

      const isNewJob = !job.name;
      const escapedCronJobEntry = cronJobEntry.replace(/'/g, "'\\''").replace(/"/g, '\\"');

      const shellCommand = isNewJob
        ? `(crontab -l 2>/dev/null; echo '${escapedCronJobEntry}') | crontab -`
        : `crontab -l | sed '/# Name: ${job.name}/,+2d' | (cat - && echo '${escapedCronJobEntry}') | crontab -`;

      const appleScriptCommand = `
        do shell script "${shellCommand}"
      `;

      try {
        await runAppleScript(appleScriptCommand);
        await showToast({
          style: Toast.Style.Success,
          title: isNewJob ? "Cron job added successfully" : "Cron job updated successfully",
        });
        onSubmit();
        popToRoot();
      } catch (error) {
        console.error("Error modifying cron job:", error);
        await showFailureToast({
          style: Toast.Style.Failure,
          title: "Failed to modify cron job",
        });
      }
    },
    initialValues: {
      name: job.name || "",
      description: job.description || "",
      cronExpression: job.cronExpression || "",
      scriptPath: job.scriptPath || [],
      parsedCronExpression: job.parsedCronExpression || "",
    },
    validation: {
      name: FormValidation.Required,
      description: FormValidation.Required,
      cronExpression: (value) => {
        if (!value) {
          return "Cron expression is required";
        }
        try {
          cronParser.parseExpression(value);
        } catch (error) {
          return "Invalid cron expression";
        }
      },
      scriptPath: (value) => {
        if (!value) {
          return "Script path is required";
        }
        const file = values.scriptPath[0];
        if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
          return "File does not exist";
        }
      },
    },
  });

  const parsedCronExpression = useMemo(() => {
    try {
      if (!values.cronExpression) return "";
      return cronstrue.toString(values.cronExpression);
    } catch (error) {
      return "Invalid cron expression";
    }
  }, [values.cronExpression]);

  return (
    <Form
      enableDrafts
      navigationTitle={job.name ? `Edit ${job.name}` : "Create Cron Job"}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save" />
          <Action.OpenWith title="Edit Script" path={values.scriptPath[0]} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.TextArea title="Description" {...itemProps.description} />
      <Form.TextField title="Cron Expression" {...itemProps.cronExpression} />
      <Form.Description title="Parsed Cron Expression" text={parsedCronExpression} />
      <Form.FilePicker title="Script Path" allowMultipleSelection={false} {...itemProps.scriptPath} />
    </Form>
  );
}

export interface CronJob {
  name: string;
  description: string;
  cronExpression: string;
  parsedCronExpression: string;
  scriptPath: string[];
}

export function parseCronJobs(cronData: string): CronJob[] {
  const lines = cronData.split("\n");
  const cronJobs: CronJob[] = [];
  let currentJob: Partial<CronJob> = {};

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("# Name:")) {
      if (Object.keys(currentJob).length > 0) {
        cronJobs.push(currentJob as CronJob);
        currentJob = {};
      }
      currentJob.name = trimmedLine.substring(7).trim();
    } else if (trimmedLine.startsWith("# Description:")) {
      currentJob.description = trimmedLine.substring(14).trim();
    } else if (trimmedLine && !trimmedLine.startsWith("#")) {
      const parts = trimmedLine.split(/\s+/);
      const scriptPathIndex = parts.findIndex((part) => part.includes("/"));
      if (scriptPathIndex !== -1) {
        currentJob.cronExpression = parts.slice(0, scriptPathIndex).join(" ");
        currentJob.parsedCronExpression = cronstrue.toString(currentJob.cronExpression);
        currentJob.scriptPath = [parts.slice(scriptPathIndex).join(" ")];
      }
    }
  }

  if (Object.keys(currentJob).length > 0) {
    cronJobs.push(currentJob as CronJob);
  }

  return cronJobs;
}

export interface CronMail {
  from: string;
  subject: string;
  date: Date;
  messageId: string;
  output: string;
  command: string;
}

function parseCronMail(mailContent: string): CronMail[] {
  // Split the content into individual email entries
  const emails = mailContent.split(/\n(?=From )/);

  // Filter and map the emails
  const cronJobs = emails
    .filter((email) => email.includes("Subject: Cron"))
    .map((email) => {
      const lines = email.split("\n");
      const jobObject = {} as CronMail;
      let isOutput = false;

      lines.forEach((line, index) => {
        if (line.startsWith("From:")) {
          jobObject.from = line.split("From:")[1].trim();
          isOutput = false;
        } else if (line.startsWith("Subject:")) {
          jobObject.subject = line.split("Subject:")[1].trim();
        } else if (line.startsWith("Date:")) {
          jobObject.date = new Date(line.split("Date:")[1].trim());
          isOutput = true;
        } else if (line.startsWith("Message-Id:")) {
          jobObject.messageId = line.split("Message-Id:")[1].trim();
        } else if (isOutput && index < lines.length - 1) {
          jobObject.output = (jobObject.output || "") + line + "\n\n";
        }
      });

      // Extract the command from the subject
      const commandMatch = jobObject.subject.match(/<[^>]+> (.+)/);
      if (commandMatch) {
        jobObject.command = commandMatch[1];
      }

      // Trim the output
      if (jobObject.output) {
        jobObject.output = jobObject.output.trim();
      }

      return jobObject;
    });

  return cronJobs;
}

async function handleDeleteCronJob(job: CronJob) {
  const options = {
    title: "Delete Cron Job",
    message: `Are you sure you want to delete the cron job "${job.name}"?`,
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
    },
  };

  if (await confirmAlert(options)) {
    const shellCommand = `crontab -l | sed '/# Name: ${job.name}/,+2d' | crontab -`;
    const appleScriptCommand = `
      do shell script "${shellCommand}"
    `;

    try {
      await runAppleScript(appleScriptCommand);
      await showToast({
        style: Toast.Style.Success,
        title: "Cron job deleted successfully",
      });
      popToRoot();
    } catch (error) {
      console.error("Error deleting cron job:", error);
      await showFailureToast("Failed to delete cron job");
    }
  }
}
