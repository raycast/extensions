import {
  Action,
  ActionPanel,
  AI,
  Detail,
  environment,
  Icon,
  LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import getCalendarsTool from "../tools/get-calendars";
import getTasksTool from "../tools/get-tasks";

interface AskTweekArgs {
  prompt?: string;
}

export default function AskTweekCommand(
  props: LaunchProps<{ arguments: AskTweekArgs }>,
) {
  const initialPrompt =
    props.arguments?.prompt?.trim() ||
    "Summarize my tasks for today and this week, highlight any overdue items, and suggest priorities.";

  const [answer, setAnswer] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    async function runAskTweek() {
      setIsLoading(true);
      try {
        if (!environment.canAccess(AI)) {
          setAnswer(
            "### Raycast Pro / AI Required\n\nTo use `AI.ask` or `@tweek` AI tools, please make sure Raycast AI is enabled on your account.\n\n> Tip: You can also press `Tab` in Raycast and type **`@tweek`** in Quick AI or AI Chat to create, update, complete, or query your Tweek tasks!",
          );
          setIsLoading(false);
          return;
        }

        const [calendarsSnapshot, tasksSnapshot] = await Promise.all([
          getCalendarsTool(),
          getTasksTool({ preset: "all" }),
        ]);

        const fullPrompt = `You are the Tweek Task Manager AI Assistant inside Raycast.
Today's Date: ${tasksSnapshot.todayISO}
Active Calendar: ${tasksSnapshot.calendar?.name}

User's Calendars:
${JSON.stringify(calendarsSnapshot.calendars, null, 2)}

User's Tasks (Overdue, Today, Upcoming, and Someday):
${JSON.stringify(tasksSnapshot.tasks, null, 2)}

User Question / Instruction:
"${initialPrompt}"

Respond concisely in helpful Markdown (use the same language as the user's question). Also remind the user that in Raycast AI Chat or Quick AI they can mention \`@tweek\` to directly create, update, complete, or delete tasks.`;

        const stream = AI.ask(fullPrompt, {
          creativity: "low",
        });

        stream.on("data", (chunk) => {
          if (!cancelled) {
            setAnswer((prev) => prev + chunk);
          }
        });

        await stream;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to run Ask Tweek AI.";
        if (!cancelled) {
          setAnswer(`### Error\n\n${msg}`);
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Ask Tweek AI Error",
          message: msg,
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void runAskTweek();
    return () => {
      cancelled = true;
    };
  }, [initialPrompt]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Ask Tweek AI (@tweek)"
      markdown={
        answer ||
        `⏳ *Fetching your live Tweek schedule and asking Raycast AI...*\n\n> **Prompt:** ${initialPrompt}`
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy AI Response"
            content={answer}
            icon={Icon.Clipboard}
          />
        </ActionPanel>
      }
    />
  );
}
