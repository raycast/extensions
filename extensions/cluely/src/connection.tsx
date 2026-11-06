import { Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { Setup } from "./components/setup";
import { findCli, loadMeetings, readableError, runCli } from "./lib/cluely";

export default function Connection() {
  const preferred = getPreferenceValues<{ cliPath?: string }>().cliPath;
  const [path, setPath] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setPath(undefined);
    setConnected(false);
    findCli(preferred)
      .then(async (cli) => {
        if (abort.signal.aborted) return;
        setPath(cli);
        await runCli(cli, ["auth", "status"], abort.signal);
        const page = await loadMeetings(cli, { since: "7d" }, abort.signal);
        if (!abort.signal.aborted) {
          setConnected(true);
          setMessage(
            `Connected. A read from Cluely succeeded (${page.items.length} meetings returned for the past 7 days). Browse Meetings can now show summaries and transcripts.`,
          );
        }
      })
      .catch((error) => {
        if (!abort.signal.aborted) setMessage(readableError(error));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [preferred, revision]);
  return loading ? (
    <Detail isLoading markdown="# Checking Cluely connection…" />
  ) : (
    <Setup
      message={message}
      cliPath={path}
      connected={connected}
      refresh={() => setRevision((value) => value + 1)}
    />
  );
}
