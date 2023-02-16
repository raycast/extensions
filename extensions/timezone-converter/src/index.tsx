import { Action, ActionPanel, Color, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { DateTime } from "luxon";
import { Fragment, createContext, useCallback, useContext, useMemo, useState } from "react";

function formatZoneName(zoneName: string) {
  return zoneName.replaceAll("/", " - ").replaceAll("_", " ");
}

const ALL_TIMEZONES = (Intl as any).supportedValuesOf("timeZone");

const markdownFn = (now: DateTime, isCustom?: boolean) => {
  const offset = now.offset / 60;
  const isNegative = offset < 0;
  const offsetString = isNegative ? offset : `+${offset}`;
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
  const { push } = useNavigation();
  const [isCustom, setIsCustom] = useState(false);
  const [time, setTime] = useState<DateTime>(DateTime.now());
  const [selectedTimezones, setSelectedTimezones] = useCachedState<string[]>("selected-timezones", []);
  const allTimezones = useMemo(() => ALL_TIMEZONES, []);
  const markdown = useCallback(markdownFn, []);

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

  function toggleTimezone(tz: string) {
    if (selectedTimezones?.includes(tz)) {
      selectedTimezones.splice(selectedTimezones.indexOf(tz), 1);
    } else {
      selectedTimezones.push(tz);
    }
    setSelectedTimezones(selectedTimezones);
  }

  return (
    <TimezoneCotext.Provider value={{ customTime: time }}>
      <Detail
        markdown={markdown(time, isCustom)}
        actions={
          <ActionPanel>
            <ActionPanel.Submenu title="Add Timezones" icon={Icon.Globe}>
              <ActionPanel.Section title="Selected">
                {selectedTimezones?.map((tz) => (
                  <Action
                    key={tz}
                    icon={{
                      source: Icon.CheckCircle,
                      tintColor: Color.Green,
                    }}
                    title={formatZoneName(tz)}
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
                        title={formatZoneName(tz)}
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
          </ActionPanel>
        }
        metadata={
          <Detail.Metadata>
            {!selectedTimezones?.length && (
              <>
                <Detail.Metadata.Label title={`No Timezones Added`} text={`Added timezones appear here`} />
              </>
            )}
            {selectedTimezones?.map((zoneName, index) => {
              const date = DateTime.fromJSDate(time.toJSDate()).setZone(zoneName);
              return (
                <Fragment key={index}>
                  <Detail.Metadata.Label
                    title={`${formatZoneName(zoneName)} (${date.toFormat("ZZZZ")})`}
                    text={date.toFormat("ff")}
                  />
                  <Detail.Metadata.Separator />
                </Fragment>
              );
            })}
          </Detail.Metadata>
        }
      />
    </TimezoneCotext.Provider>
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
