import { Action, ActionPanel, Detail, LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { setTimeout as sleep } from "node:timers/promises";
import { api } from "./api";

interface AskAnswer {
  answer?: string;
  toolsUsed?: string[];
  remaining_questions?: number;
}

interface AskJob extends AskAnswer {
  job_id: string;
  status: "pending" | "done" | "failed";
  error?: string;
}

// Asked async so a long answer never holds one HTTP request open; the job is polled until it settles.
async function ask(question: string): Promise<AskAnswer> {
  const started = await api<AskJob & AskAnswer>("/ask", {
    method: "POST",
    body: JSON.stringify({ question, client: "raycast", async: true }),
  });
  if (!started.job_id) return started;
  for (;;) {
    await sleep(2000);
    const job = await api<AskJob>(`/ask/${started.job_id}`);
    if (job.status === "done") return job;
    if (job.status === "failed")
      throw new Error(job.error || "The question could not be answered. Nothing was charged.");
  }
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Ask }>) {
  // Opened from a deeplink or a quicklink, the argument can be missing.
  const question = (props.arguments?.question ?? "").trim();
  const { data, isLoading } = usePromise(ask, [question], {
    execute: question.length > 0,
    failureToastOptions: { title: "SEOmatic could not answer" },
  });

  if (!question) {
    return (
      <Detail markdown={"Type your question after the command, for example `Which keywords are closest to page 1?`"} />
    );
  }

  const footer =
    data?.remaining_questions !== undefined
      ? `\n\n---\n_Free questions left this month: ${data.remaining_questions}_`
      : "";
  const markdown = isLoading
    ? `## ${question}\n\nSEOmatic is working on it...`
    : data
      ? `## ${question}\n\n${data.answer ?? "No answer."}${footer}`
      : `## ${question}\n\nNo answer.`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data?.toolsUsed?.length ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Tools Used">
              {data.toolsUsed.map((tool) => (
                <Detail.Metadata.TagList.Item key={tool} text={tool} />
              ))}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        data?.answer ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Answer" content={data.answer} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
