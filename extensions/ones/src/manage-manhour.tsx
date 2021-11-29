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
  useNavigation
} from "@raycast/api";
import {
  addManhour,
  deleteManhour,
  getUserByName,
  listManhours,
  MANHOUR_BASE,
  ManhourType,
  updateManhour
} from "./lib/api";
import { Manhour, Task } from "./lib/type";
import { useEffect, useState } from "react";
import moment from "moment";
import { convertTaskURL, weekdays } from "./lib/util";

async function getManhourUserUUID(): Promise<string> {
  let userUUID: string = preferences.manhourUser.value as string;
  if (!userUUID || userUUID.length === 0) {
    // 如果工时管理 - 用户为空，则默认使用登录用户
    userUUID = preferences.userUUID.value as string;
    return Promise.resolve(userUUID);
  }
  if (/^[a-zA-Z0-9]{8}$/.test(userUUID)) {
    return Promise.resolve(userUUID);
  }
  const user = await getUserByName(userUUID);
  return Promise.resolve(user.uuid);
}

type Result = {
  manhoursMap: { [key: string]: Manhour[] };
  manhourDates: string[];
  weekdaysMap: { [key: string]: string };
  manhourSums: { [key: string]: number };
};

async function convertResult(result: Manhour[]): Promise<Result> {
  const manhoursMap: { [key: string]: Manhour[] } = {};
  const manhourDates: string[] = [];
  const weekdaysMap: { [key: string]: string } = {};
  const manhourDatesMap: { [key: string]: boolean } = {};
  const manhourSums: { [key: string]: number } = {};
  result.forEach(manhour => {
    manhour.task.url = convertTaskURL(manhour.task.uuid);
    const m = moment(manhour.startTime * 1000);
    const startTime: string = m.format("YYYY-MM-DD");
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

    if (!manhourSums[startTime]) {
      manhourSums[startTime] = manhour.hours / MANHOUR_BASE;
    } else {
      manhourSums[startTime] += manhour.hours / MANHOUR_BASE;
    }
  });
  manhourDates.sort((a, b) => {
    return moment(b).valueOf() - moment(a).valueOf();
  });
  return Promise.resolve({
    manhoursMap,
    manhourDates,
    weekdaysMap,
    manhourSums
  });
}

interface UpdateManhourFormValues {
  startTime: Date;
  hours: string;
  description: string;
}

export function AddOrUpdateManhour(props: { manhour?: Manhour; manhourTask?: Task }) {
  const { pop } = useNavigation();
  return (
    <Form navigationTitle={props.manhour ?
      `Modify Manhour - #${props.manhour.task.number} ${props.manhour.task.name}` :
      `Record Manhour` + (props.manhourTask ? ` - #${props.manhourTask?.number} ${props.manhourTask?.name}` : "")}
          actions={
            <ActionPanel title="Translate">
              <SubmitFormAction title="Confirm" onSubmit={async (input: UpdateManhourFormValues): Promise<void> => {
                try {
                  console.log("input", input);
                  const hours: number = parseFloat(input.hours);
                  let manhour: Manhour;
                  if (!props.manhour) {
                    // 登记工时
                    let manhourTaskUUID = props.manhourTask?.uuid;
                    if (!manhourTaskUUID) {
                      manhourTaskUUID = preferences.manhourTaskUUID.value as string;
                      if (!manhourTaskUUID) {
                        showToast(ToastStyle.Failure, "Manhour Task is empty");
                        return Promise.reject(new Error("manhourTaskUUID is empty"));
                      }
                    }
                    manhour = {
                      task: {
                        uuid: manhourTaskUUID
                      },
                      owner: {
                        uuid: preferences.userUUID.value as string
                      },
                      type: ManhourType.RECORDED,
                      startTime: Math.floor(input.startTime.getTime() / 1000),
                      hours: hours * MANHOUR_BASE,
                      description: input.description
                    };
                    console.log("add manhour", manhour);
                    await addManhour(manhour);
                    showToast(ToastStyle.Success, `Recorded ${hours} hours`);
                  } else {
                    // 修改登记工时
                    manhour = Object.assign({}, props.manhour, {
                      startTime: Math.floor(input.startTime.getTime() / 1000),
                      hours: Math.floor(hours * MANHOUR_BASE),
                      description: input.description
                    });
                    console.log("update manhour", manhour);
                    await updateManhour(manhour);
                    showToast(ToastStyle.Success, `Modified ${hours} hours`);
                  }
                  pop();
                } catch (err) {
                  showToast(ToastStyle.Failure, (err as Error).message);
                }
              }} />
            </ActionPanel>
          }>
      <Form.DatePicker title="StartTime" id="startTime"
                       defaultValue={props.manhour?.startTime ? new Date(props.manhour.startTime * 1000) : new Date()} />
      <Form.TextField title="Hours" id="hours"
                      defaultValue={`${props.manhour?.hours ? props.manhour.hours / MANHOUR_BASE : ""}`} />
      <Form.TextArea title="Description" id="description"
                     defaultValue={`${props.manhour?.description ? props.manhour.description : ""}`} />
    </Form>
  );
}

export default function ManageManhour() {
  const [manhoursMap, setManhoursMap] = useState<{ [key: string]: Manhour[] }>({});
  const [manhourDates, setManhourDates] = useState<string[]>([]);
  const [weekdaysMap, setWeekdaysMap] = useState<{ [key: string]: string }>({});
  const [manhourSums, setManhourSums] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      console.log("ManageManhour useEffect");
      const userUUID = await getManhourUserUUID();
      const manhourDays: number = preferences.manhourDays.value ? preferences.manhourDays.value as number : 7;
      const startDate = moment().subtract(manhourDays, "d").format("YYYY-MM-DD");
      const manhours = await listManhours(userUUID, startDate);
      const result = await convertResult(manhours);
      setManhoursMap(result.manhoursMap);
      setWeekdaysMap(result.weekdaysMap);
      setManhourSums(result.manhourSums);
      setManhourDates(result.manhourDates);
      setLoading(false);
    })();
  }, []);

  const onSearchTextChange = async (text: string) => {
    console.log("onSearchTextChange", text);
    let startDate: string;
    if (text.length === 0) {
      const manhourDays: number = preferences.manhourDays.value ? preferences.manhourDays.value as number : 7;
      startDate = moment().subtract(manhourDays, "d").format("YYYY-MM-DD");
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        showToast(ToastStyle.Failure, "日期格式错误，应为 YYYY-MM-DD");
        return;
      }
      startDate = text;
    }

    setLoading(true);
    const userUUID = await getManhourUserUUID();
    const manhours = await listManhours(userUUID, startDate);
    const result = await convertResult(manhours);
    setManhoursMap(result.manhoursMap);
    setWeekdaysMap(result.weekdaysMap);
    setManhourSums(result.manhourSums);
    setManhourDates(result.manhourDates);
    setLoading(false);
  };

  return (
    <List
      isLoading={loading}
      onSearchTextChange={onSearchTextChange}
      throttle
    >
      {manhourDates.map(
        (startDate: string, index: number) => (
          <List.Section
            title={`${startDate} / ${weekdaysMap[startDate]} / ${manhourSums[startDate]}小时`}
            key={index}
          >
            {manhoursMap[startDate].map((item: Manhour) => (
              <List.Item
                key={item.uuid}
                title={`#${item.task.number} ${item.task.name} ${(item.hours / 100000)}小时`}
                subtitle={item.task.project ? item.task.project.name : ""}
                accessoryTitle={item.description}
                accessoryIcon={item.owner.avatar}
                actions={
                  <ActionPanel>
                    <PushAction title="修改登记工时" target={<AddOrUpdateManhour manhour={item} />} />
                    <PushAction title="登记工时" target={<AddOrUpdateManhour />} />
                    <SubmitFormAction title="删除登记工时" onSubmit={async () => {
                      try {
                        if (!item.uuid) {
                          showToast(ToastStyle.Failure, "登记工时UUID为空");
                          return;
                        }
                        await deleteManhour(item.uuid);
                        showToast(ToastStyle.Success, `成功删除登记工时`);
                      } catch (err) {
                        showToast(ToastStyle.Failure, (err as Error).message);
                      }
                    }} />
                    <OpenInBrowserAction url={item.task.url ? item.task.url : ""} />
                    <CopyToClipboardAction title="Copy URL" content={item.task.url ? item.task.url : ""} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )
      )}
    </List>
  );
}

// render(<ManageManhour />);
