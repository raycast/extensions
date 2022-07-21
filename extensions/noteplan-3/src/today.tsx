import { NoteType, notesExtension } from "./lib/note-utilities";
import { NoteDetail } from "./lib/components";
import { format } from "date-fns";

export default () => (
  <NoteDetail
    entry={{
      relativePath: `Calendar/${format(new Date(), "yyyyMMdd")}.${notesExtension()}`,
      fileName: format(new Date(), "yyyyMMdd"),
      type: NoteType.Calendar,
    }}
  />
);
