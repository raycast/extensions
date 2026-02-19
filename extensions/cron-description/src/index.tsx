import { Form, ActionPanel, Action, Keyboard } from "@raycast/api";
import cronstrue from "cronstrue";
import { CronExpressionParser } from "cron-parser";
import { useEffect, useState } from "react";

const TIMEZONES = ["UTC", ...Intl.supportedValuesOf("timeZone")];

export default function main() {
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [cron, setCron] = useState("* * * * *");
  const [cronTimezone, setCronTimezone] = useState(localTimezone);
  const [cronError, setCronError] = useState("");
  const [description, setDescription] = useState("");
  const [nextRunCronTz, setNextRunCronTz] = useState("");
  const [nextRunLocalTz, setNextRunLocalTz] = useState("");

  useEffect(() => {
    try {
      setCronError("");
      setDescription(cronstrue.toString(cron));
    } catch {
      setCronError("Invalid expression");
      setDescription("");
      setNextRunCronTz("");
      setNextRunLocalTz("");
      return;
    }

    // Calculate next run times
    try {
      const parserTz = cronTimezone === "UTC" ? "Etc/UTC" : cronTimezone;
      const interval = CronExpressionParser.parse(cron, { tz: parserTz });
      const nextDate = interval.next().toDate();

      // Format for cron's timezone
      const cronTzFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: parserTz,
        dateStyle: "medium",
        timeStyle: "long",
      });
      setNextRunCronTz(`${cronTzFormatter.format(nextDate)} (${cronTimezone})`);

      // Format for user's local timezone (only show if different)
      if (cronTimezone !== localTimezone) {
        const localTzFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: localTimezone,
          dateStyle: "medium",
          timeStyle: "long",
        });
        setNextRunLocalTz(`${localTzFormatter.format(nextDate)} (${localTimezone})`);
      } else {
        setNextRunLocalTz("");
      }
    } catch {
      setNextRunCronTz("Unable to calculate");
      setNextRunLocalTz("");
    }
  }, [cron, cronTimezone, localTimezone]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Description to Clipboard" content={description} />
          <Action.CopyToClipboard title="Copy Cron Expression to Clipboard" content={cron} />
          <Action.CopyToClipboard
            title="Copy Next Run (Local)"
            content={nextRunLocalTz || nextRunCronTz}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="cron" title="Cron Expression" value={cron} onChange={setCron} error={cronError} autoFocus />
      <Form.Dropdown id="timezone" title="Cron Timezone" value={cronTimezone} onChange={setCronTimezone}>
        {TIMEZONES.map((tz) => (
          <Form.Dropdown.Item key={tz} value={tz} title={tz} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description title="Description" text={description || "—"} />
      <Form.Description title="Next Run (Cron TZ)" text={nextRunCronTz || "—"} />
      {nextRunLocalTz && <Form.Description title="Next Run (Your TZ)" text={nextRunLocalTz} />}
    </Form>
  );
}
