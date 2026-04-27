import { Detail } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getSessions } from "./api";

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  return `${minutes} min`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Command() {
  const { data, isLoading } = useCachedPromise(
    async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return await getSessions(thirtyDaysAgo.toISOString(), new Date().toISOString());
    },
    [],
    {
      onError: (error) => {
        showFailureToast(error);
      },
    },
  );

  const sessions = data?.sessions ?? [];
  const markdown = sessions.length
    ? `# Your Sessions (Last 30 days)

${sessions
  .map((s) => {
    const partner = s.users?.[0]?.name || "Unknown";
    return `- ${formatDate(s.startTime)}: ${partner} (${formatDuration(s.duration)})`;
  })
  .join("\n")}
`
    : isLoading
      ? ""
      : "No sessions found in the last 30 days";

  return <Detail isLoading={isLoading} markdown={markdown} />;
}
