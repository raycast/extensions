export type StatusSource = {
  syncError?: string;
  totalOnRecord: number;
  log?: { records: number; parsed: number };
  collector?: { running: boolean };
};

function parserIsBlind(data: StatusSource): boolean {
  return data.totalOnRecord === 0 && !!data.log && data.log.records > 0 && data.log.parsed === 0;
}

export type StatusNote = { kind: "sync" | "blind" | "collector" | "empty"; title: string; body: string };

export function statusNotes(data: StatusSource | undefined, isLoading = true): StatusNote[] {
  if (!data) return [];
  const notes: StatusNote[] = [];

  if (data.syncError) {
    notes.push({
      kind: "sync",
      title: "Data unavailable",
      body:
        data.totalOnRecord === 0
          ? `These numbers may be incomplete. ${data.syncError}`
          : `New sessions are not being read. ${data.syncError}`,
    });
  }

  if (parserIsBlind(data)) {
    const seen = data.log?.records ?? 0;
    notes.push({
      kind: "blind",
      title: "Cannot read Focus sessions",
      body: `${seen} log ${seen === 1 ? "entry" : "entries"} found, none readable. Totals may be wrong.`,
    });
  }

  if (data.collector && !data.collector.running) {
    notes.push({ kind: "collector", title: "Not recording", body: "Open the Menu Bar Stats command to resume." });
  }

  if (!isLoading && data.totalOnRecord === 0 && !data.syncError && !parserIsBlind(data)) {
    notes.push({ kind: "empty", title: "No sessions yet", body: "Finish a Focus session to start." });
  }

  return notes;
}
