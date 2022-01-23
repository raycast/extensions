import { List, Icon, ActionPanel, SubmitFormAction, showToast, ToastStyle } from "@raycast/api";
import dayjs from "dayjs";
import { TimeEntry } from "../toggl/types";
import useCurrentTime from "../hooks/useCurrentTime";
import { storage } from "../storage";
import toggl from "../toggl";
import { useAppContext } from "../context";

function RunningTimeEntry({ runningTimeEntry }: { runningTimeEntry: TimeEntry }) {
  const currentTime = useCurrentTime();
  const { projects } = useAppContext();
  const getProjectById = (id: number) => projects.find((p) => p.id === id);

  const stopTimeEntry = async () => {
    await toggl.stopTimeEntry({ id: runningTimeEntry.id });
    await storage.runningTimeEntry.refresh();
    await showToast(ToastStyle.Success, `Stopped time entry ${runningTimeEntry.description}`);
  };

  return (
    <List.Section title="Running time entry" key="running-time-entry">
      <List.Item
        title={runningTimeEntry.description || "No description"}
        subtitle={dayjs.duration(dayjs(currentTime).diff(runningTimeEntry.start), "milliseconds").format("HH:mm:ss")}
        accessoryTitle={getProjectById(runningTimeEntry?.pid)?.name}
        accessoryIcon={{ source: Icon.Dot, tintColor: getProjectById(runningTimeEntry?.pid)?.hex_color }}
        icon={{ source: Icon.Clock, tintColor: getProjectById(runningTimeEntry?.pid)?.hex_color }}
        actions={
          <ActionPanel>
            <SubmitFormAction onSubmit={stopTimeEntry} title="Stop time entry" />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

export default RunningTimeEntry;
