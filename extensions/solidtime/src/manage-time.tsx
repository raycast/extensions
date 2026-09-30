import { Entry } from "./views/shared/Entry.js";
import { TimeEntryCommand } from "./views/timeEntries/TimeCommand.js";

export default function Command() {
  return (
    <Entry>
      <TimeEntryCommand />
    </Entry>
  );
}
