import {
  ActionPanel,
  CopyToClipboardAction,
  Form,
  List,
  OpenInBrowserAction,
  preferences,
  PushAction,
  showToast,
  SubmitFormAction,
  ToastStyle,
  useNavigation,
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
import { Manhour, Task, User } from "./lib/type";
import { useEffect, useState } from "react";
import moment from "moment";
import { convertTaskURL, weekdays } from "./lib/util";
import client from "./lib/client";

async function getManhourUserUUID(): Promise<string> {
  let manhourUser: string = preferences.manhourUser.value as string;
  if (!manhourUser || manhourUser.length === 0) {
    // 如果工时管理 - 用户为空，则默认使用登录用户
    manhourUser = await client.getUserUUID();
    if (!manhourUser) {
      await client.initHttpClient();
      manhourUser = await client.getUserUUID();
    }
    return Promise.resolve(manhourUser);
  }
  if (/^[a-zA-Z0-9]{8}$/.test(manhourUser)) {
    return Promise.resolve(manhourUser);
  }
  const users: User[] = await listUsersByName(manhourUser);
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

async function convertResult(result: Manhour[]): Promise<Result> {
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
  return Promise.resolve({
    manhoursMap,
    manhourDates,
    weekdaysMap,
    manhourRecordedSums,
    manhourEstimatedSums,
  });
}

interface UpdateManhourFormValues {
  startTime: Date;
  hours: string;
  description: string;
  manhourType: string;
}

export function AddOrUpdateManhour(props: { manhour?: Manhour; manhourTask?: Task }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={
        props.manhour
          ? `Modify Manhour - #${props.manhour.task.number} ${props.manhour.task.name}`
          : `Add Manhour` + (props.manhourTask ? ` - #${props.manhourTask?.number} ${props.manhourTask?.name}` : "")
      }
      actions={
        <ActionPanel>
          <SubmitFormAction
            title="Confirm"
            onSubmit={async (input: UpdateManhourFormValues) => {
              try {
                const hours: number = parseFloat(input.hours);
                let manhour: Manhour;
                if (!props.manhour) {
                  // Add manhour
                  let manhourTaskUUID = props.manhourTask?.uuid;
                  if (!manhourTaskUUID) {
                    manhourTaskUUID = preferences.manhourTaskUUID.value as string;
                    if (!manhourTaskUUID) {
                      showToast(ToastStyle.Failure, "Manhour Task is empty");
                      return;
                    }
                  }
                  let manhourUserUUID = await client.getUserUUID();
                  if (!manhourUserUUID) {
                    await client.initHttpClient();
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
                  await addManhour(manhour);
                  showToast(ToastStyle.Success, "Add manhour successfully", `${input.manhourType} ${hours}h`);
                } else {
                  manhour = Object.assign({}, props.manhour, {
                    startTime: Math.floor(input.startTime.getTime() / 1000),
                    hours: Math.floor(hours * MANHOUR_BASE),
                    description: input.description,
                  });
                  await updateManhour(manhour);
                  showToast(ToastStyle.Success, "Modified");
                }
                pop();
              } catch (err) {
                showToast(
                  ToastStyle.Failure,
                  `${(props.manhour ? "Modify" : "Add") + " manhour failed"}`,
                  (err as Error).message
                );
              }
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
      <Form.TextArea
        title="Description"
        id="description"
        defaultValue={`${props.manhour?.description ? props.manhour.description : ""}`}
      />
      <Form.Dropdown id="manhourType" title="Manhour Type" defaultValue={ManhourType.RECORDED}>
        <Form.Dropdown.Item value={ManhourType.RECORDED} title="Record" icon="🚀" />
        <Form.Dropdown.Item value={ManhourType.ESTIMATED} title="Estimate" icon="🤔" />
      </Form.Dropdown>
    </Form>
  );
}

interface ManageManhourProps {
  taskUUID?: string;
}

export function ManageManhour(props: ManageManhourProps) {
  const [manhoursMap, setManhoursMap] = useState<{ [key: string]: Manhour[] }>({});
  const [manhourDates, setManhourDates] = useState<string[]>([]);
  const [weekdaysMap, setWeekdaysMap] = useState<{ [key: string]: string }>({});
  const [manhourRecordedSums, setManhourRecordedSums] = useState<{ [key: string]: number }>({});
  const [manhourEstimatedSums, setManhourEstimatedSums] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = async (userUUID: string, startDate: string, taskUUID?: string) => {
    const manhours = await listManhours({ userUUID, startDate, taskUUID });
    const result = await convertResult(manhours);
    setManhoursMap(result.manhoursMap);
    setWeekdaysMap(result.weekdaysMap);
    setManhourRecordedSums(result.manhourRecordedSums);
    setManhourEstimatedSums(result.manhourEstimatedSums);
    setManhourDates(result.manhourDates);
  };

  useEffect(() => {
    (async () => {
      try {
        const userUUID = await getManhourUserUUID();
        const manhourDays: number = preferences.manhourDays.value ? (preferences.manhourDays.value as number) : 7;
        const startDate = moment().subtract(manhourDays, "d").format("YYYY-MM-DD");
        await refresh(userUUID, startDate, props.taskUUID);
      } catch (err) {
        showToast(ToastStyle.Failure, "Query manhour failed", (err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSearchTextChange = async (text: string) => {
    let startDate: string;
    if (text.length === 0) {
      const manhourDays: number = preferences.manhourDays.value ? (preferences.manhourDays.value as number) : 7;
      startDate = moment().subtract(manhourDays, "d").format(dateFormat);
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        showToast(ToastStyle.Failure, `Invalid date format, should be ${dateFormat}`);
        return;
      }
      startDate = text;
    }

    setLoading(true);
    try {
      const userUUID = await getManhourUserUUID();
      await refresh(userUUID, startDate, props.taskUUID);
      setLoading(false);
    } catch (err) {
      showToast(ToastStyle.Failure, "Query manhour failed", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <List isLoading={loading} onSearchTextChange={onSearchTextChange} throttle>
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
              subtitle={item.task.project ? item.task.project.name : ""}
              accessoryTitle={item.description}
              accessoryIcon={item.owner.avatar}
              actions={
                <ActionPanel>
                  <PushAction icon="✏️" title="Modify Manhour" target={<AddOrUpdateManhour manhour={item} />} />
                  <PushAction icon="⌛️" title="Add Manhour" target={<AddOrUpdateManhour />} />
                  <SubmitFormAction
                    icon="⚠️"
                    title="Delete Manhour"
                    onSubmit={async () => {
                      try {
                        if (!item.uuid) {
                          showToast(ToastStyle.Failure, "Manhour uuid is empty");
                          return;
                        }
                        await deleteManhour(item.uuid);
                        showToast(ToastStyle.Success, "Delete manhour successfully");
                      } catch (err) {
                        showToast(ToastStyle.Failure, "Delete manhour failed", (err as Error).message);
                      }
                    }}
                  />
                  <OpenInBrowserAction url={item.task.url ? item.task.url : ""} />
                  <CopyToClipboardAction title="Copy URL" content={item.task.url ? item.task.url : ""} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
