import { Entry } from "../api";
import { Action, AI, Detail, environment, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

export async function summariseDay(standup: Record<string, Entry>): Promise<string> {
  if (!environment.canAccess(AI)) {
    return "You need AI for this";
  }

  return AI.ask(
    `Paramaters: use personal pronouns like "I did this task". Given the following JSON structure, format it into a short summary of the that the user can say at a stand-up meeting. Be concise and use natural language. Use the correct tense given the timestamps given for the day. Do not make anything up, do not add decorative language. Given the timestamps, try to figure out a rough estimate how long was spent on each task, and use phrases like "In the morning" or "In the afternoon" or "I spent the morning". Ensure the summary is chronological, start early.: ${JSON.stringify(
      standup,
    )}`,
  );
}

function Summariser(props: { day: Record<string, Entry> }) {
  const { isLoading, data } = useCachedPromise(
    (input: Record<string, Entry>) => {
      return summariseDay(input);
    },
    [props.day],
  );

  return <Detail isLoading={isLoading} markdown={`# Summary\n\n ${data || "Please wait..."}`} />;
}

export function SummariseDayAction(props: { day?: Record<string, Entry> }) {
  if (!environment.canAccess(AI)) {
    return null;
  }

  if (!props.day) {
    return null;
  }

  return <Action.Push title="Open AI Summary" icon={Icon.Stars} target={<Summariser day={props.day} />} />;
}
