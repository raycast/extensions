import { List } from "@raycast/api";
import { renderAttendance } from "../lib/markdown";
import type { Entry, Template } from "../lib/types";

export function AttendanceDetail({
  template,
  entries,
  selectedId,
}: {
  template?: Template;
  entries: Entry[];
  selectedId?: string;
}) {
  return <List.Item.Detail markdown={renderAttendance(template, entries, selectedId)} />;
}
