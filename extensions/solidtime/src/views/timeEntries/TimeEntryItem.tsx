import { Action, Color, Icon, List, useNavigation } from "@raycast/api";
import { invalidate, useProjects } from "../../api/hooks.js";
import { api, type CreateTimeEntryBody, type TimeEntry } from "../../api/index.js";
import { NO_DATA } from "../../utils/constants.js";
import { formatDuration, formatTime } from "../../utils/formatters.js";
import { tagBillable } from "../../utils/list.js";
import { useMembership, useOrgId } from "../../utils/membership.js";
import { messageBuilder, tryWithToast, usePreferredExit } from "../../utils/operations.js";
import { djs, getTimeStamp } from "../../utils/time.js";
import { CrudActions } from "../shared/CrudActions.js";
import { Entry } from "../shared/Entry.js";
import { TimeEntryForm } from "./TimeEntryForm.js";

function useTimeEntryAccessories(orgId: string | null) {
  const projects = useProjects(orgId);

  return (timeEntry: TimeEntry) => {
    const accessories: List.Item.Accessory[] = [];
    const project = projects.data?.find((project) => project.id === timeEntry.project_id)?.name;
    if (project) {
      accessories.push({ tag: { value: project, color: Color.Green }, icon: Icon.Folder });
    }
    if (timeEntry.billable) {
      accessories.push(tagBillable());
    }
    let value = formatTime(timeEntry.start);
    if (timeEntry.end) {
      value += ` - ${formatTime(timeEntry.end)}`;
    }
    accessories.push({ tag: { value }, icon: Icon.Clock });
    const spentTime = timeEntry.duration
      ? djs.duration({ seconds: timeEntry.duration })
      : djs.duration({ milliseconds: djs().diff(djs(timeEntry.start)) });
    accessories.push({
      tag: formatDuration(spentTime),
      icon: Icon.Stopwatch,
    });
    return accessories;
  };
}

export type TimeEntryItemProps = { timeEntry: TimeEntry };

export function TimeEntryItem({ timeEntry }: TimeEntryItemProps) {
  const ctx = useMembership();
  const orgId = useOrgId();
  const accessories = useTimeEntryAccessories(orgId);
  const navigation = useNavigation();
  const preferredExit = usePreferredExit();

  const isActive = !timeEntry.end;

  if (!orgId || !ctx.membership) return null;

  return (
    <List.Item
      key={timeEntry.id}
      title={timeEntry.description || NO_DATA}
      accessories={accessories(timeEntry)}
      icon={isActive ? Icon.Play : Icon.Calendar}
      actions={
        <CrudActions
          name="Time Entry"
          onNew={() =>
            navigation.push(
              <Entry>
                <TimeEntryForm
                  onSubmit={async (values) => {
                    await tryWithToast(
                      () => {
                        if (!ctx.membership) throw new Error("No membership selected");
                        return api.createTimeEntry(
                          {
                            billable: values.billable,
                            member_id: ctx.membership.id,
                            start: getTimeStamp(),
                            description: values.description || null,
                            project_id: values.project_id || null,
                          },
                          { params: { organization: orgId } },
                        );
                      },
                      messageBuilder("create", "time entry"),
                    );
                    preferredExit();
                    navigation.pop();
                    invalidate("timeEntries");
                  }}
                />
              </Entry>,
            )
          }
          onDelete={async () => {
            await tryWithToast(
              () => api.deleteTimeEntry(undefined, { params: { organization: orgId, timeEntry: timeEntry.id } }),
              messageBuilder("delete", "time entry"),
            );
            invalidate("timeEntries");
          }}
          itemActions={
            isActive ? (
              <Action
                title="Stop"
                icon={Icon.Stop}
                onAction={async () => {
                  await tryWithToast(
                    () =>
                      api.updateTimeEntry(
                        { end: getTimeStamp() },
                        { params: { organization: orgId, timeEntry: timeEntry.id } },
                      ),
                    messageBuilder("stop", "time entry"),
                  );
                  preferredExit();
                  invalidate("timeEntries");
                }}
              />
            ) : (
              <Action
                title="Start"
                icon={Icon.Play}
                onAction={async () => {
                  await tryWithToast(
                    () => {
                      if (!ctx.membership) throw new Error("No membership set");
                      const body: CreateTimeEntryBody = {
                        member_id: ctx.membership?.id,
                        project_id: timeEntry.project_id,
                        task_id: timeEntry.task_id,
                        start: getTimeStamp(),
                        billable: timeEntry.billable,
                        description: timeEntry.description,
                        tags: timeEntry.tags,
                      };
                      return api.createTimeEntry(body, { params: { organization: orgId } });
                    },
                    messageBuilder("start", "time entry"),
                  );
                  preferredExit();
                  invalidate("timeEntries");
                }}
              />
            )
          }
        />
      }
    />
  );
}
