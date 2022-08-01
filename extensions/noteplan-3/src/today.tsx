import { NoteType } from "./lib/note-utilities";
import { getPreferences } from "./lib/preferences";
import { NoteDetail } from "./lib/components";
import { format } from "date-fns";

export default () => (
  <NoteDetail
    entry={{
      relativePath: `Calendar/${format(new Date(), "yyyyMMdd")}.${getPreferences.extension}`,
      fileName: format(new Date(), "yyyyMMdd"),
      type: NoteType.Calendar,
    }}
  />
);
