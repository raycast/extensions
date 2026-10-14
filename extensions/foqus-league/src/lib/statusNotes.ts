export type StatusSource = {
  syncError?: string;
  totalOnRecord: number;
  log?: { records: number; parsed: number };
  collector?: { running: boolean };
  menuBarOff?: boolean;
};

function parserIsBlind(data: StatusSource): boolean {
  return !!data.log && data.log.records > 0 && data.log.parsed === 0;
}

export type StatusNote = {
  kind: "sync" | "blind" | "menuBar" | "collector" | "empty";
  title: string;
  body: string;
  onReturn?: string;
};

export const noteDetail = (note: StatusNote) =>
  note.onReturn ? `${note.body} Press Return to ${note.onReturn}.` : note.body;

export function statusNotes(data: StatusSource | undefined, isLoading = true): StatusNote[] {
  if (!data) return [];
  const notes: StatusNote[] = [];

  if (data.syncError) {
    notes.push(
      data.totalOnRecord === 0
        ? { kind: "sync", title: "Can't load your sessions", body: `Some numbers may be missing. ${data.syncError}` }
        : { kind: "sync", title: "Can't check for new sessions", body: `Your totals may be behind. ${data.syncError}` },
    );
  }

  if (parserIsBlind(data)) {
    notes.push({
      kind: "blind",
      title: "Can't read Focus sessions",
      body: "Foqus found entries it can't read. Totals may be wrong.",
    });
  }

  if (data.menuBarOff) {
    notes.push({
      kind: "menuBar",
      title: "Menu Bar Stats is off",
      body: "Without it, your sessions aren't counted.",
      onReturn: "turn it on",
    });
  } else if (data.collector && !data.collector.running) {
    notes.push({ kind: "collector", title: "Not recording", body: "Click Menu Bar Stats in the menu bar to resume." });
  }

  if (!isLoading && data.totalOnRecord === 0 && !data.syncError && !parserIsBlind(data) && !data.menuBarOff) {
    notes.push({ kind: "empty", title: "No sessions yet", body: "Start one from Raycast or Menu Bar Stats." });
  }

  return notes;
}
