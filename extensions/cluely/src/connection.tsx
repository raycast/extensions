import { Detail, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { Setup } from "./components/setup";
import { findCli, loadMeetings, readableError, runCli } from "./lib/cluely";

async function check(preferred: string | undefined, signal?: AbortSignal) {
  const cli = await findCli(preferred);
  try {
    await runCli(cli, ["auth", "status"], signal);
    const page = await loadMeetings(cli, { since: "7d" }, signal);
    return {
      path: cli,
      connected: true,
      message: `Connected. A read from Cluely succeeded (${page.items.length} meetings returned for the past 7 days). Browse Meetings can now show summaries and transcripts.`,
    };
  } catch (error) {
    return { path: cli, connected: false, message: readableError(error) };
  }
}

export default function Connection() {
  const preferred = getPreferenceValues<Preferences>().cliPath;
  const abortable = useRef<AbortController>(null);
  const { data, error, isLoading, revalidate } = usePromise(
    (preferred?: string) => check(preferred, abortable.current?.signal),
    [preferred],
    { abortable, onError: () => undefined },
  );
  return isLoading ? (
    <Detail isLoading markdown="# Checking Cluely connection…" />
  ) : (
    <Setup
      message={data?.message ?? readableError(error)}
      cliPath={data?.path}
      connected={data?.connected ?? false}
      refresh={revalidate}
    />
  );
}
