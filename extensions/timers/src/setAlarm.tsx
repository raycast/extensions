import { Action, ActionPanel, Form, getPreferenceValues, Toast, useNavigation } from "@raycast/api";
import { soundData } from "./backend/soundData";
import { checkForOverlyLoudAlert, ensureCTFileExists, startTimer } from "./backend/timerBackend";
import { Preferences, AlarmValues } from "./backend/types";

export default function CustomTimerView() {
  const { pop } = useNavigation();
  const prefs: Preferences = getPreferenceValues();

  function alarmToSeconds(alarm: Date) {
    const seconds = (alarm.getTime() - Date.now()) / 1000;
    if (seconds < 0) {
      new Toast({ style: Toast.Style.Failure, title: "Alarm cannot be in the past" }).show();
      return -1;
    }
    return seconds;
  }

  const handleSubmit = (values: AlarmValues) => {
    ensureCTFileExists();
    if (!checkForOverlyLoudAlert()) return;
    const timeInSeconds = alarmToSeconds(values.alarm);
    if (timeInSeconds === -1) return;
    const timerName = values.name || "Alarm";

    startTimer({
      timeInSeconds,
      timerName,
      selectedSound: values.selectedSound,
    }).then(pop);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Alarm" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="alarm" title="Alarm" defaultValue={new Date()} />
      <Form.Dropdown id="selectedSound" defaultValue="default" title="Sound">
        <Form.Dropdown.Item value="default" title="Default" />
        {soundData.map((item, index) => (
          <Form.Dropdown.Item
            key={index}
            title={item.value === prefs.selectedSound ? `${item.title} (currently selected)` : item.title}
            value={item.value}
            icon={item.icon}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField id="name" title="Name" placeholder="Alarm" />
    </Form>
  );
}
