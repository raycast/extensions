import { NoteType } from "./lib/note-utilities";
import { getPreferences } from "./lib/preferences";
import { NoteDetail } from "./lib/components";
import { format } from "date-fns";

export default () => {
  const path = `${format(new Date(), "yyyyMMdd")}.${getPreferences().fileExtension}`;
  return (
    <NoteDetail
      entry={{
        relativePath: `/Calendar/${path}`,
        fileName: format(new Date(), "yyyyMMdd"),
        type: NoteType.Calendar,
        callbackPath: path,
      }}
    />
  );
};
