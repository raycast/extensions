import type { LaunchProps } from "@raycast/api";
import { useState } from "react";
import { resolveDateArg } from "@lib/daily-desk";
import { DateFormatsDetail } from "./components/date-formats";
import { DailyDeskOpen } from "./components/open";
import { DailyDeskSearch } from "./components/search";

type Arguments = {
  date?: string;
  workspace?: string;
};

export default function OpenDailyDeskNoteCommand(props: LaunchProps<{ arguments: Arguments }>) {
  const [showSearch, setShowSearch] = useState(false);
  const requestedDate = resolveDateArg(props.arguments.date);
  const requestedWorkspace = props.arguments.workspace?.trim() ?? "";

  if (requestedDate === null && !showSearch) {
    return <DateFormatsDetail onSearch={() => setShowSearch(true)} />;
  }

  if (requestedDate !== "" && !showSearch) {
    return <DailyDeskOpen date={requestedDate} requestedWorkspace={requestedWorkspace} />;
  }

  return <DailyDeskSearch requestedWorkspace={requestedWorkspace} />;
}
