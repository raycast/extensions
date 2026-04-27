import { Detail } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getProfile, getSessions } from "./api";

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
      const [profile, sessionsResponse] = await Promise.all([
        getProfile(),
        getSessions(thirtyDaysAgo.toISOString(), new Date().toISOString()),
      ]);
      return { currentUserId: profile.userId, sessions: sessionsResponse.sessions };
    },
    [],
    {
      onError: (error) => {
        showFailureToast(error);
      },
    },
  );

  const sessions = data?.sessions ?? [];
  const currentUserId = data?.currentUserId;
  const markdown = sessions.length
    ? `# Your Sessions (Last 30 days)

${sessions
  .map((s) => {
    const partner = s.users?.find((u) => u.userId !== currentUserId)?.name ?? "No partner";
    return `- ${formatDate(s.startTime)}: ${partner} (${formatDuration(s.duration)})`;
  })
  .join("\n")}
`
    : isLoading
      ? ""
      : "No sessions found in the last 30 days";

  return <Detail isLoading={isLoading} markdown={markdown} />;
}
