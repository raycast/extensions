import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Form,
  Icon,
  confirmAlert,
  useNavigation,
  getPreferenceValues,
  List,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { DateTime, IANAZone } from "luxon";
import { Fragment, createContext, useCallback, useContext, useMemo, useState } from "react";

interface Preferences {
  sortTimezones: "manually" | "alphabetically";
  hideWorldMap: boolean;
}

const preferences = getPreferenceValues<Preferences>();
const ALL_TIMEZONES = ["UTC", ...(Intl as any).supportedValuesOf("timeZone")];

function formatZoneName(zoneName: string) {
  return zoneName?.replaceAll("/", " - ").replaceAll("_", " ");
}

// function hoursDiffBetween(date1: DateTime, date2: DateTime) {
//   if (!date1 || !date2) return "+0hrs";
//   const now = Date.now();
//   let date1Offset = IANAZone.create(date1.zoneName).offset(now) / 60;
//   let date2Offset = IANAZone.create(date2.zoneName).offset(now) / 60;

//   if (date1Offset < 0) {
//     date1Offset *= -1;
//   }

//   if (date2Offset < 0) {
//     date2Offset *= 1;
//   }

//   const result = date1Offset + date2Offset;
//   const isNegative = result < 0;

//   return [isNegative ? `${result}hrs` : `+${result}hrs`, isNegative];
// }

function getTimezoneOffsetString(zone?: string) {
  if (!zone) return;
  try {
    const offset = IANAZone.create(zone).offset(Date.now()) / 60;
    const isNegative = offset < 0;
    return isNegative ? `GMT${offset}` : `GMT+${offset}`;
  } catch (err) {
    return ``;
  }
}

const markdownFn = (now: DateTime, isCustom?: boolean) => {
  const offset = now.offset / 60;
  const isNegative = offset < 0;
  const isZero = offset === 0;
  const offsetString = isNegative ? offset : isZero ? `` : `+${offset}`;
  return `
# ${isCustom ? "Custom time" : "Local time"}
## ${now.toFormat("ff")}
${formatZoneName(now.zoneName)} (${now.toFormat("ZZZZ")})
![${formatZoneName(now.zoneName)}](timezones/UTC${offsetString}.png)
`;
};

const defaultContextValue: { customTime?: DateTime } = {
  customTime: undefined,
};

const TimezoneCotext = createContext({ ...defaultContextValue });

function Timezones() {
  const [isCustom, setIsCustom] = useState(false);
  const [time, setTime] = useState<DateTime>(DateTime.now());
  const [selectedTimezones, setSelectedTimezones] = useCachedState<string[]>("selected-timezones", []);
  const allTimezones = useMemo(() => ALL_TIMEZONES, []);
  const markdown = useCallback(markdownFn, []);
  const { push } = useNavigation();

  function setCustomTime() {
    push(
      <CustomTime
        onSelect={(newTime: DateTime) => {
          if (!newTime) return;
          setTime(newTime);
          setIsCustom(true);
        }}
      />
    );
  }

  function resetCustomTime() {
    const now = DateTime.fromJSDate(new Date());
    setIsCustom(false);
    setTime(now);
  }

  function toggleTimezone(tz?: string) {
    if (!tz) return;
    const tzName = tz.replace(/ (\(.*\))/gim, "");
    if (selectedTimezones.includes(tzName)) {
      selectedTimezones.splice(selectedTimezones.indexOf(tzName), 1);
    } else {
      selectedTimezones.push(tzName);
    }
    setSelectedTimezones(selectedTimezones);
  }

  const addedTimezones = preferences.sortTimezones === "alphabetically" ? selectedTimezones.sort() : selectedTimezones;

  function updateSort(addedTimezones: string[]) {
    setSelectedTimezones(addedTimezones);
  }

  function timezonesActions() {
    return (
      <ActionPanel>
        <ActionPanel.Submenu title="Add Timezones" icon={Icon.Globe}>
          <ActionPanel.Section title="Selected">
            {addedTimezones.map((tz) => (
              <Action
                key={tz}
                icon={{
                  source: Icon.CheckCircle,
                  tintColor: Color.Green,
                }}
                title={`${formatZoneName(tz)} (${getTimezoneOffsetString(tz)})`}
                onAction={() => toggleTimezone(tz)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="Others">
            {allTimezones
              ?.filter((tz: string) => !selectedTimezones?.includes(tz))
              ?.map((tz: string) => {
                const isSelected = selectedTimezones?.includes(tz);
                return (
                  <Action
                    key={tz}
                    icon={{
                      source: isSelected ? Icon.CheckCircle : Icon.Circle,
                      tintColor: isSelected ? Color.Green : Color.SecondaryText,
                    }}
                    title={`${formatZoneName(tz)} (${getTimezoneOffsetString(tz)})`}
                    onAction={() => toggleTimezone(tz)}
                  />
                );
              })}
          </ActionPanel.Section>
        </ActionPanel.Submenu>
        <Action
          title={isCustom ? `Clear Custom Time` : `Set Custom Time`}
          onAction={isCustom ? resetCustomTime : setCustomTime}
          icon={Icon.Clock}
        />
        <ActionPanel.Section>
          {preferences.sortTimezones === "manually" && (
            <Action.Push
              title="Reorder Timezones"
              target={
                <OrderTimezones
                  timezones={addedTimezones}
                  onSort={async function (addedTimezones: string[]): Promise<void> {
                    await updateSort(addedTimezones);
                  }}
                />
              }
              icon={Icon.Switch}
            />
          )}
          {selectedTimezones?.length > 0 && (
            <Action
              title={`Remove Added Timezones`}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              style={Action.Style.Destructive}
              onAction={() => {
                confirmAlert({
                  primaryAction: {
                    title: "Remove All",
                    style: Alert.ActionStyle.Destructive,
                    onAction: () => {
                      setSelectedTimezones([]);
                    },
                  },
                  title: `Are you sure you want remove all timezones?`,
                });
              }}
              icon={Icon.Eraser}
            />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  return (
    <TimezoneCotext.Provider value={{ customTime: time }}>
      {preferences.hideWorldMap ? (
        <List>
          {!selectedTimezones?.length && (
            <>
              <List.EmptyView
                title="No Timezones Added"
                description="Added timezones appear here"
                actions={timezonesActions()}
              />
            </>
          )}
          {selectedTimezones?.map((zoneName, index) => {
            const date = DateTime.fromJSDate(time.toJSDate()).setZone(zoneName);
            // const hoursDiff = hoursDiffBetween(time, date);
            return (
              <Fragment key={index}>
                <List.Item
                  title={`${formatZoneName(zoneName)} (${date.toFormat("ZZZZ")})`}
                  accessories={[{ tag: date.toFormat("ff") }]}
                  actions={timezonesActions()}
                ></List.Item>
              </Fragment>
            );
          })}
        </List>
      ) : (
        <Detail
          markdown={markdown(time, isCustom)}
          actions={timezonesActions()}
          metadata={
            <Detail.Metadata>
              {!selectedTimezones?.length && (
                <>
                  <Detail.Metadata.Label title={`No Timezones Added`} text={`Added timezones appear here`} />
                </>
              )}
              {selectedTimezones?.map((zoneName, index) => {
                const date = DateTime.fromJSDate(time.toJSDate()).setZone(zoneName);
                // const hoursDiff = hoursDiffBetween(time, date);
                return (
                  <Fragment key={index}>
                    <Detail.Metadata.TagList title={`${formatZoneName(zoneName)} (${date.toFormat("ZZZZ")})`}>
                      <Detail.Metadata.TagList.Item text={date.toFormat("ff")} />
                      {/* <Detail.Metadata.TagList.Item
                        color={hoursDiff[1] ? Color.Orange : Color.Green}
                        text={`${hoursDiff[0]}`}
                      /> */}
                    </Detail.Metadata.TagList>
                    <Detail.Metadata.Separator />
                  </Fragment>
                );
              })}
            </Detail.Metadata>
          }
        />
      )}
    </TimezoneCotext.Provider>
  );
}

function OrderTimezones(props: { timezones: string[]; onSort: (addedTimezones: string[]) => void }) {
  const { timezones } = props;
  const [timeZones, setTimeZones] = useState(timezones);

  const moveUp = (index: number) => {
    if (index > 0) {
      const updatedTimezones = [...timeZones];
      const temp = updatedTimezones[index];
      updatedTimezones[index] = updatedTimezones[index - 1];
      updatedTimezones[index - 1] = temp;
      setTimeZones(updatedTimezones);
      props.onSort(updatedTimezones);
    }
  };

  const moveDown = (index: number) => {
    if (index < timezones.length - 1) {
      const updatedTimezones = [...timeZones];
      const temp = updatedTimezones[index];
      updatedTimezones[index] = updatedTimezones[index + 1];
      updatedTimezones[index + 1] = temp;
      setTimeZones(updatedTimezones);
      props.onSort(updatedTimezones);
    }
  };

  const remove = (index: number) => {
    const updatedTimezones = [...timeZones];
    updatedTimezones.splice(index, 1);
    setTimeZones(updatedTimezones);
    props.onSort(updatedTimezones);
  };

  return (
    <List navigationTitle="Reorder Timezones">
      {timeZones &&
        timeZones.map((tz, index) => {
          return (
            <List.Item
              key={tz}
              title={tz}
              icon={Icon.Clock}
              actions={
                <ActionPanel>
                  {index > 0 && (
                    <Action
                      title="Move Up"
                      shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                      icon={Icon.ChevronUp}
                      onAction={() => moveUp(index)}
                    ></Action>
                  )}
                  {index < timezones.length - 1 && (
                    <Action
                      title="Move Down"
                      shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                      icon={Icon.ChevronDown}
                      onAction={() => moveDown(index)}
                    ></Action>
                  )}
                  <Action
                    title="Remove Timezone"
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      if (await confirmAlert({ title: `Are you sure you want to delete "${tz}"?` })) {
                        remove(index);
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}

function CustomTime({ onSelect }: { onSelect: (newTime: DateTime) => void }) {
  const { pop } = useNavigation();
  const { customTime } = useContext(TimezoneCotext);
  const now = DateTime.now();
  const [value, setValue] = useState<DateTime | null>(customTime || now);
  const allTimezones = useMemo(() => ALL_TIMEZONES, []);

  function confirm() {
    if (!value) return;

    const { day, month, year, hour, minute, second, millisecond } = DateTime.fromJSDate(value?.toJSDate()).toLocal();

    !!value &&
      onSelect &&
      onSelect(
        value
          .set({
            day,
            month,
            year,
            hour,
            minute,
            second,
            millisecond,
          })
          .setZone(value.zoneName)
      );
    pop();
  }

  function updateTimezone(newZone: string) {
    if (!value) return;
    setValue(value.setZone(newZone));
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Confirm" onAction={confirm} />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        type={Form.DatePicker.Type.DateTime}
        autoFocus
        id="customTime"
        title={`Custom time`}
        value={value?.toJSDate()}
        onChange={(newValue) => {
          setValue(newValue ? DateTime.fromJSDate(newValue).setZone(value?.zoneName) : null);
        }}
      />
      <Form.Dropdown id="timezone" title="Timezone" defaultValue={(value || now).zoneName} onChange={updateTimezone}>
        {allTimezones?.map((tz: string) => (
          <Form.Dropdown.Item key={tz} value={tz} title={tz} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function Command() {
  return <Timezones />;
}
