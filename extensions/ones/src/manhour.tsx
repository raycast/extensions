import {
  ActionPanel,
  Action,
  Form,
  List,
  getPreferenceValues,
  showToast,
  useNavigation,
  Toast,
  Icon,
  Alert,
  confirmAlert,
} from "@raycast/api";
import {
  addManhour,
  deleteManhour,
  listManhours,
  listUsersByName,
  MANHOUR_BASE,
  ManhourType,
  updateManhour,
} from "./lib/api";
import { Manhour, Preferences, Task, User } from "./lib/type";
import { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { convertTaskURL, weekdays } from "./lib/util";
import client from "./lib/client";

async function getManhourUserUUID(signal?: AbortSignal): Promise<string> {
  let manhourUser: string = getPreferenceValues<Preferences>().manhourUser as string;
  if (!manhourUser || manhourUser.length === 0) {
    // 如果工时管理 - 用户为空，则默认使用登录用户
    manhourUser = await client.getUserUUID();
    if (!manhourUser) {
      await client.initHttpClient(signal);
      manhourUser = await client.getUserUUID();
    }
    return Promise.resolve(manhourUser);
  }
  if (/^[a-zA-Z0-9]{8}$/.test(manhourUser)) {
    return Promise.resolve(manhourUser);
  }
  const users = await listUsersByName(manhourUser, signal);
  if (users.length === 0) {
    return Promise.reject(new Error(`user not found: ${manhourUser}`));
  }
  return Promise.resolve(users[0].uuid);
}

type Result = {
  manhoursMap: { [key: string]: Manhour[] };
  manhourDates: string[];
  weekdaysMap: { [key: string]: string };
  manhourRecordedSums: { [key: string]: number };
  manhourEstimatedSums: { [key: string]: number };
};

const dateFormat = "YYYY-MM-DD";

function convertResult(result: Manhour[]): Result {
  const manhoursMap: { [key: string]: Manhour[] } = {};
  const manhourDates: string[] = [];
  const weekdaysMap: { [key: string]: string } = {};
  const manhourDatesMap: { [key: string]: boolean } = {};
  const manhourRecordedSums: { [key: string]: number } = {};
  const manhourEstimatedSums: { [key: string]: number } = {};
  result.forEach((manhour) => {
    manhour.task.url = convertTaskURL(manhour.task.uuid);
    const m = moment(manhour.startTime * 1000);
    const startTime: string = m.format(dateFormat);
    if (!manhourDatesMap[startTime]) {
      manhourDates.push(startTime);
      manhourDatesMap[startTime] = true;
    }

    weekdaysMap[startTime] = weekdays[m.weekday()];

    if (!manhoursMap[startTime]) {
      manhoursMap[startTime] = [manhour];
    } else {
      manhoursMap[startTime].push(manhour);
    }

    switch (manhour.type) {
      case ManhourType.RECORDED:
        if (!manhourRecordedSums[startTime]) {
          manhourRecordedSums[startTime] = manhour.hours / MANHOUR_BASE;
        } else {
          manhourRecordedSums[startTime] += manhour.hours / MANHOUR_BASE;
        }
        break;
      case ManhourType.ESTIMATED:
        if (!manhourEstimatedSums[startTime]) {
          manhourEstimatedSums[startTime] = manhour.hours / MANHOUR_BASE;
        } else {
          manhourEstimatedSums[startTime] += manhour.hours / MANHOUR_BASE;
        }
        break;
    }
  });
  manhourDates.sort((a, b) => {
    return moment(b).valueOf() - moment(a).valueOf();
  });
  return {
    manhoursMap,
    manhourDates,
    weekdaysMap,
    manhourRecordedSums,
    manhourEstimatedSums,
  };
}

interface UpdateManhourFormValues {
  startTime: Date;
  hours: string;
  description: string;
  manhourType: string;
}

interface AddOrUpdateManhourProps {
  manhour?: Manhour;
  task?: Task;
}

export function AddOrUpdateManhour(props: AddOrUpdateManhourProps) {
  const { pop } = useNavigation();

  const submit = useCallback((input: UpdateManhourFormValues) => {
    const abortCtrl = new AbortController();
    const fn = async () => {
      try {
        const hours: number = parseFloat(input.hours);
        let manhour: Manhour;
        if (!props.manhour) {
          // Add manhour
          let manhourTaskUUID = props.task?.uuid;
          if (!manhourTaskUUID) {
            manhourTaskUUID = getPreferenceValues<Preferences>().manhourTaskUUID as string;
            if (!manhourTaskUUID) {
              showToast(Toast.Style.Failure, "Manhour Task is empty");
              return;
            }
          }
          let manhourUserUUID = await client.getUserUUID();
          if (!manhourUserUUID) {
            await client.initHttpClient(abortCtrl.signal);
            manhourUserUUID = await client.getUserUUID();
          }
          manhour = {
            task: {
              uuid: manhourTaskUUID,
            },
            owner: {
              uuid: manhourUserUUID,
            },
            type: input.manhourType as ManhourType,
            startTime: Math.floor(input.startTime.getTime() / 1000),
            hours: hours * MANHOUR_BASE,
            description: input.description,
          };
          await addManhour(manhour, abortCtrl.signal);
          showToast(Toast.Style.Success, "Add manhour successfully", `${input.manhourType} ${hours}h`);
        } else {
          manhour = Object.assign({}, props.manhour, {
            startTime: Math.floor(input.startTime.getTime() / 1000),
            hours: Math.floor(hours * MANHOUR_BASE),
            description: input.description,
          });
          await updateManhour(manhour, abortCtrl.signal);
          showToast(Toast.Style.Success, "Modified");
        }
        pop();
      } catch (err) {
        showToast(
          Toast.Style.Failure,
          `${(props.manhour ? "Modify" : "Add") + " manhour failed"}`,
          (err as Error).message,
        );
      }
    };
    fn();
    return () => abortCtrl.abort();
  }, []);

  return (
    <Form
      navigationTitle={
        props.manhour
          ? `Modify Manhour - #${props.manhour.task.number} ${props.manhour.task.name}`
          : `Add Manhour` + (props.task ? ` - #${props.task?.number} ${props.task?.name}` : "")
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Confirm"
            onSubmit={(input: UpdateManhourFormValues) => {
              submit(input);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        title="StartTime"
        id="startTime"
        defaultValue={props.manhour?.startTime ? new Date(props.manhour.startTime * 1000) : new Date()}
      />
      <Form.TextField
        title="Hours"
        id="hours"
        defaultValue={`${props.manhour?.hours ? props.manhour.hours / MANHOUR_BASE : ""}`}
      />
      <Form.TextArea title="Description" id="description" defaultValue={`${props.manhour?.description ?? ""}`} />
      <Form.Dropdown id="manhourType" title="Manhour Type" defaultValue={ManhourType.RECORDED}>
        <Form.Dropdown.Item value={ManhourType.RECORDED} title="Record" icon="🚀" />
        <Form.Dropdown.Item value={ManhourType.ESTIMATED} title="Estimate" icon="🤔" />
      </Form.Dropdown>
    </Form>
  );
}

interface ManageManhourProps {
  showOthersManhour?: boolean;
  task?: Task;
}

export function ManageManhour(props: ManageManhourProps) {
  const [manhoursMap, setManhoursMap] = useState<{ [key: string]: Manhour[] }>({});
  const [manhourDates, setManhourDates] = useState<string[]>([]);
  const [weekdaysMap, setWeekdaysMap] = useState<{ [key: string]: string }>({});
  const [manhourRecordedSums, setManhourRecordedSums] = useState<{ [key: string]: number }>({});
  const [manhourEstimatedSums, setManhourEstimatedSums] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>("");

  const search = useCallback(
    (text: string) => {
      const abortCtrl = new AbortController();
      const fn = async () => {
        let startDate: string;
        if (text.length === 0) {
          const pref = getPreferenceValues<Preferences>();
          const manhourDays: number = pref.manhourDays ? (+pref.manhourDays as number) : 7;
          startDate = moment().subtract(manhourDays, "d").format(dateFormat);
        } else {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
            showToast(Toast.Style.Failure, `Invalid date format, should be ${dateFormat}`);
            return;
          }
          startDate = text;
        }

        setLoading(true);
        try {
          let userUUID: string | undefined;
          if (!props.showOthersManhour) {
            userUUID = await getManhourUserUUID(abortCtrl.signal);
          }

          const manhours = await listManhours({ userUUID, startDate, taskUUID: props.task?.uuid }, abortCtrl.signal);
          const result = convertResult(manhours);
          setManhoursMap(result.manhoursMap);
          setWeekdaysMap(result.weekdaysMap);
          setManhourRecordedSums(result.manhourRecordedSums);
          setManhourEstimatedSums(result.manhourEstimatedSums);
          setManhourDates(result.manhourDates);

          setSearchText(text);
        } catch (err) {
          showToast(Toast.Style.Failure, "Search failed", (err as Error).message);
        } finally {
          setLoading(false);
        }
      };
      fn();
      return () => abortCtrl.abort();
    },
    [setManhoursMap, setWeekdaysMap, setManhourRecordedSums, setManhourEstimatedSums, setManhourDates, setSearchText],
  );

  useEffect(() => {
    search("");
  }, []);

  const onDelete = useCallback((uuid: string | undefined) => {
    const abortCtrl = new AbortController();
    const fn = async () => {
      try {
        if (!uuid) {
          showToast(Toast.Style.Failure, "Manhour uuid is empty");
          return;
        }
        await deleteManhour(uuid);
        showToast(Toast.Style.Success, "Delete manhour successfully");
        search(searchText);
      } catch (err) {
        showToast(Toast.Style.Failure, "Delete manhour failed", (err as Error).message);
      }
    };
    fn();
    return () => abortCtrl.abort();
  }, []);

  return (
    <List
      isLoading={loading}
      onSearchTextChange={search}
      searchBarPlaceholder={`Search start date like ${moment().format("YYYY-MM-DD")}`}
      throttle
    >
      <List.EmptyView
        title="No Results"
        actions={
          <ActionPanel>
            <Action.Push icon={Icon.Plus} title="Add Manhour" target={<AddOrUpdateManhour task={props.task} />} />
          </ActionPanel>
        }
      />
      {manhourDates.map((startDate: string, index: number) => (
        <List.Section
          title={`${startDate} / ${weekdaysMap[startDate]} ${
            manhourRecordedSums[startDate] ? ` / Recorded ${manhourRecordedSums[startDate]}h` : ""
          }${manhourEstimatedSums[startDate] ? ` / Estimated ${manhourEstimatedSums[startDate]}h` : ""}`}
          key={index}
        >
          {manhoursMap[startDate].map((item: Manhour) => (
            <List.Item
              key={item.uuid}
              title={`#${item.task.number} ${item.task.name} ${item.hours / 100000}h ${item.type}`}
              subtitle={item.task.project?.name ?? ""}
              accessories={[
                {
                  text: item.description,
                  icon: item.owner.avatar,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Pencil}
                    title="Modify Manhour"
                    target={<AddOrUpdateManhour manhour={item} task={props.task} />}
                  />
                  <Action.Push icon={Icon.Plus} title="Add Manhour" target={<AddOrUpdateManhour task={props.task} />} />
                  <Action.SubmitForm
                    icon={Icon.Trash}
                    title="Delete Manhour"
                    onSubmit={async () => {
                      const options: Alert.Options = {
                        title: "Delete the Manhour?",
                        message: "You will not be able to recover it",
                        primaryAction: {
                          title: "Delete Manhour",
                          style: Alert.ActionStyle.Destructive,
                          onAction: () => {
                            onDelete(item.uuid);
                          },
                        },
                      };
                      await confirmAlert(options);
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  />
                  <Action.OpenInBrowser url={item.task.url ?? ""} />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={item.task.url ?? ""}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.SubmitForm
                    title="Refresh"
                    onSubmit={() => {
                      search(searchText);
                    }}
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
