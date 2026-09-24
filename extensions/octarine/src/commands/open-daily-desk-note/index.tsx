import type { LaunchProps } from "@raycast/api";
import { useState } from "react";
import { resolveDateArg } from "@lib/daily-desk";
import { DateFormatsDetail } from "./components/date-formats";
import { DailyDeskOpen } from "./components/open";
import { DailyDeskSearch } from "./components/search";

export default function OpenDailyDeskNoteCommand(
  props: LaunchProps<{ arguments: Partial<Arguments.OpenDailyDeskNote> }>,
) {
  const [showSearch, setShowSearch] = useState(false);
  const requestedDate = resolveDateArg(props.arguments.date);
  const requestedWorkspace = props.arguments.workspace?.trim() ?? "";

  if (requestedDate === null && !showSearch) {
    return <DateFormatsDetail onSearch={() => setShowSearch(true)} />;
  }

  if (requestedDate !== null && requestedDate !== "" && !showSearch) {
    return <DailyDeskOpen date={requestedDate} requestedWorkspace={requestedWorkspace} />;
  }

  return <DailyDeskSearch requestedWorkspace={requestedWorkspace} />;
}
