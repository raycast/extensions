import { DailyNote } from "./dailyNoteCommand";

export default function Command() {
  return <DailyNote actionTitle="Previous Daily Note" commandId="daily-notes:goto-prev" />;
}
