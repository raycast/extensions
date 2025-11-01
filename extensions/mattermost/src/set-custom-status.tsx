import { Action, LocalStorage, ActionPanel, Icon, List, Form, useNavigation, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { withAuthorization } from "./shared/withAuthorization";
import { MattermostClient } from "./shared/MattermostClient";
import { CustomProfileStatus, CustomStatusDuration, durationToString } from "./shared/MattermostTypes";
import { DateTime } from "luxon";
import { emojiCodeMap } from "./shared/emojiCodes";

/////////////////////////////////////////
//////////////// Types //////////////////
/////////////////////////////////////////

interface CustomProfileStatusUI {
  title: string;
  emoji: string;
  duration?: string;
  model: CustomProfileStatus;
}

function modelToUI(model: CustomProfileStatus): CustomProfileStatusUI {
  return {
    title: model.text,
    emoji: emojiCodeMap.get(model.emojiCode) ?? "💬",
    duration: model.duration && durationToString(model.duration, model.expires_at),
    model: model,
  };
}

interface StateValue {
  current?: CustomProfileStatusUI;
  presets: CustomProfileStatusUI[];
}

async function getCachedPresets(): Promise<CustomProfileStatus[] | undefined> {
  return LocalStorage.getItem<string>("status-presets").then((cachedStateJson) =>
    cachedStateJson ? (JSON.parse(cachedStateJson) as CustomProfileStatus[]) : undefined,
  );
}

async function setCachedPresets(presets: CustomProfileStatusUI[]): Promise<void> {
  return LocalStorage.setItem("status-presets", JSON.stringify(presets.map((status) => status.model)));
}

interface State {
  value: StateValue;
  setCurrent: (value?: CustomProfileStatus) => void;
  setPreset: (index: number, value: CustomProfileStatus) => void;
  addPreset: (value: CustomProfileStatus) => void;
  updatePreset: (index: number, value: CustomProfileStatus) => void;
  removePreset: (index: number) => void;
}

const defaultStatuses: CustomProfileStatus[] = [
  {
    text: "Focus Mode",
    emojiCode: "technologist",
    duration: "one_hour",
  },
  {
    text: "In a Meeting",
    emojiCode: "spiral_calendar_pad",
    duration: "one_hour",
  },
  {
    text: "Eating",
    emojiCode: "hamburger",
    duration: "one_hour",
  },
  {
    text: "AFK",
    emojiCode: "walking",
  },
];

/////////////////////////////////////////
/////////////// Command /////////////////
/////////////////////////////////////////

export default function Command() {
  return withAuthorization(<StatusesList />);
}

function StatusesList() {
  const [stateValue, setStateValue] = useState<StateValue | undefined>();

  useEffect(() => {
    (async () => {
      const presets = (await getCachedPresets()) ?? defaultStatuses;

      const profile = await MattermostClient.getMe();
      const statusJSON = profile.props["customStatus"];
      console.log(statusJSON);

      let current: CustomProfileStatusUI | undefined = undefined;
      if (statusJSON !== "") {
        const status = JSON.parse(statusJSON) as CustomProfileStatus;
        console.log(status.expires_at, DateTime.local().toString());
        if (status.expires_at != undefined && DateTime.fromISO(status.expires_at) > DateTime.local()) {
          current = modelToUI(status);
        } else if (status.expires_at == undefined) {
          current = modelToUI(status);
        }
      }

      setStateValue({
        current: current,
        presets: presets.map(modelToUI),
      });
    })();
  }, []);

  if (stateValue == undefined) {
    return <List isLoading={true} />;
  }

  const state: State = {
    value: stateValue,

    setCurrent: function (value?: CustomProfileStatus | undefined): void {
      const newState: StateValue = { ...stateValue };
      if (value !== undefined) {
        console.log("update current");
        const newStatus = {
          title: value.text,
          emoji: emojiCodeMap.get(value.emojiCode) ?? "💬",
          duration: value.duration && durationToString(value.duration),
          model: value,
        };
        newState.current = newStatus;
        newState.presets.unshift(newStatus);
      } else {
        newState.current = undefined;
      }
      setStateValue(newState);
      setCachedPresets(newState.presets);
    },

    setPreset: function (index: number, value: CustomProfileStatus): void {
      const newState = { ...stateValue };
      newState.presets[index] = modelToUI(value);
      newState.current = newState.presets[index];
      newState.presets.unshift(newState.presets.splice(index, 1)[0]);
      setStateValue(newState);
      setCachedPresets(newState.presets);
    },

    addPreset: function (value: CustomProfileStatus): void {
      const newState = { ...stateValue };
      const newPresent: CustomProfileStatusUI = {
        title: value.text,
        emoji: emojiCodeMap.get(value.emojiCode) ?? "💬",
        duration: value.duration && durationToString(value.duration),
        model: value,
      };

      newState.presets.unshift(newPresent);
      setStateValue(newState);
      setCachedPresets(newState.presets);
    },

    updatePreset: function (index: number, value: CustomProfileStatus): void {
      const newState = { ...stateValue };
      const updatedPresent: CustomProfileStatusUI = {
        title: value.text,
        emoji: emojiCodeMap.get(value.emojiCode) ?? "💬",
        duration: value.duration && durationToString(value.duration),
        model: value,
      };

      newState.presets.unshift(newState.presets.splice(index, 1)[0]);
      newState.presets[0] = updatedPresent;
      setStateValue(newState);
      setCachedPresets(newState.presets);
    },

    removePreset: function (index: number): void {
      const newState = { ...stateValue };
      newState.presets.splice(index, 1);
      setStateValue(newState);
      setCachedPresets(newState.presets);
    },
  };

  return (
    <List searchBarPlaceholder="Search status by name...">
      <List.Section key="currentStatus" title="Current Status">
        <CurrentStatusItem state={state} />
      </List.Section>

      <List.Section key="recentStatus" title="Recent presets">
        {stateValue?.presets.map((_status, index) => (
          <PresetStatusItem key={`preset_${index}`} state={state} index={index} />
        ))}
      </List.Section>
    </List>
  );
}

/////////////////////////////////////////
//////////////// Item ///////////////////
/////////////////////////////////////////

function CurrentStatusItem(props: { state: State }) {
  const status = props.state.value.current;

  return (
    <List.Item
      key="currentStatus"
      title={status?.title ?? "No status"}
      subtitle={status?.duration}
      icon={status?.emoji ?? Icon.Message}
      actions={
        status ? (
          <ActionPanel>
            <ActionPanel.Section key="main">
              <ClearStatusAction state={props.state} />
              <SetCustomStatusAction state={props.state} />
            </ActionPanel.Section>
            <ActionPanel.Section key="presets">
              <CreatePresetAction state={props.state} />
            </ActionPanel.Section>
          </ActionPanel>
        ) : (
          <ActionPanel>
            <ActionPanel.Section key="main">
              <SetCustomStatusAction state={props.state} />
            </ActionPanel.Section>
            <ActionPanel.Section key="presets">
              <CreatePresetAction state={props.state} />
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    />
  );
}

function PresetStatusItem(props: { state: State; index: number }) {
  const status = props.state.value.presets[props.index];

  return (
    <List.Item
      icon={status.emoji}
      title={status.title}
      subtitle={status.duration}
      actions={
        <ActionPanel>
          <ActionPanel.Section key="main">
            <SetStatusAction state={props.state} index={props.index} />
            <SetStatusWithDuration state={props.state} index={props.index} />
          </ActionPanel.Section>
          <ActionPanel.Section key="modifications">
            <EditPresetAction state={props.state} index={props.index} />
            <DeletePresetAction state={props.state} index={props.index} />
          </ActionPanel.Section>
          <ActionPanel.Section key="global">
            <CreatePresetAction state={props.state} />
            <SetCustomStatusAction state={props.state} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/////////////////////////////////////////
/////////////// Actions /////////////////
/////////////////////////////////////////

function SetStatusAction(props: { state: State; index: number }) {
  return (
    <Action
      key="setStatus"
      title="Set Status"
      icon={Icon.Pencil}
      onAction={async () => {
        const status = props.state.value.presets[props.index].model;
        try {
          showToast(Toast.Style.Animated, "Setting status...");
          await MattermostClient.setCustomStatus(status);
          props.state.setPreset(props.index, status);
          showToast(Toast.Style.Success, "Success set status");
        } catch (error) {
          showToast(Toast.Style.Failure, `Fail ${error}`);
        }
      }}
    />
  );
}

function SetStatusWithDuration(props: { state: State; index: number }) {
  const durationPairs: { title: string; value: CustomStatusDuration }[] = [
    { title: "30 Minutes", value: "thirty_minutes" },
    { title: "1 Hour", value: "one_hour" },
    { title: "4 Hours", value: "four_hours" },
    { title: "Today", value: "today" },
    { title: "This Week", value: "this_week" },
  ];

  return (
    <ActionPanel.Submenu icon={Icon.Clock} title="Set Status with Duration">
      {durationPairs.map((duration) => {
        return (
          <Action
            key={duration.value}
            title={duration.title}
            icon={Icon.Clock}
            onAction={async () => {
              const status = props.state.value.presets[props.index].model;
              status.duration = duration.value;
              try {
                showToast(Toast.Style.Animated, "Setting status...");
                await MattermostClient.setCustomStatus(status);
                props.state.setPreset(props.index, status);
                showToast(Toast.Style.Success, "Success set status");
              } catch (error) {
                showToast(Toast.Style.Failure, `Fail ${error}`);
              }
            }}
          />
        );
      })}
    </ActionPanel.Submenu>
  );
}

function DeletePresetAction(props: { state: State; index: number }) {
  return (
    <Action
      key="deleteStatus"
      title="Delete Status"
      icon={Icon.Trash}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={() => props.state.removePreset(props.index)}
    />
  );
}

function EditPresetAction(props: { state: State; index: number }) {
  const navigation = useNavigation();

  function handleSubmit(values: Form.Values) {
    props.state.updatePreset(props.index, {
      text: values.statusText,
      emojiCode: values.emoji,
      duration: values.clearAfter,
    });

    navigation.pop();
  }

  return (
    <Action
      key="editStatus"
      title="Edit Status"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={() => {
        const status = props.state.value.presets[props.index];
        navigation.push(<StatusForm mode={StatusFormMode.EditStatus} onSubmit={handleSubmit} status={status} />);
      }}
    />
  );
}

function CreatePresetAction(props: { state: State }) {
  const navigation = useNavigation();

  async function handleSubmit(values: Form.Values) {
    props.state.addPreset({
      text: values.statusText,
      emojiCode: values.emoji,
      duration: values.clearAfter,
    });

    showToast(Toast.Style.Success, "Preset created");
    navigation.pop();
  }

  return (
    <Action
      key="createPreset"
      title="Create Status Preset"
      icon={Icon.Document}
      shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
      onAction={() => navigation.push(<StatusForm mode={StatusFormMode.CreateStatus} onSubmit={handleSubmit} />)}
    />
  );
}

function ClearStatusAction(props: { state: State }) {
  return (
    <Action
      key="clearStatus"
      title="Clear Status"
      icon={Icon.XMarkCircle}
      onAction={async () => {
        try {
          showToast(Toast.Style.Animated, "Clear status...");
          await MattermostClient.clearCustomStatus();
          props.state.setCurrent(undefined);
          showToast(Toast.Style.Success, "Success clear status");
        } catch (error) {
          showToast(Toast.Style.Failure, `Fail ${error}`);
        }
      }}
    />
  );
}

function SetCustomStatusAction(props: { state: State }) {
  const navigation = useNavigation();

  async function handleSubmit(values: Form.Values) {
    const newValue: CustomProfileStatus = {
      text: values.statusText,
      emojiCode: values.emoji,
      duration: values.clearAfter,
    };

    try {
      showToast(Toast.Style.Animated, "Setting status...");
      await MattermostClient.setCustomStatus(newValue);
      props.state.setCurrent(newValue);
      showToast(Toast.Style.Success, "Success set status");
      navigation.pop();
    } catch (error) {
      showToast(Toast.Style.Failure, `Fail ${error}`);
    }
  }

  return (
    <Action
      key="setCustomStatus"
      title="Set Custom Status"
      icon={Icon.Message}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() => navigation.push(<StatusForm mode={StatusFormMode.SetCustomStatus} onSubmit={handleSubmit} />)}
    />
  );
}

/////////////////////////////////////////
///////////// Status Form ///////////////
/////////////////////////////////////////

enum StatusFormMode {
  SetCustomStatus,
  CreateStatus,
  EditStatus,
}

function StatusForm(props: {
  status?: CustomProfileStatusUI;
  mode: StatusFormMode;
  onSubmit: (values: Form.Values) => void;
}) {
  let submitActionTitle = "";
  let navigationTitle = "";
  switch (props.mode) {
    case StatusFormMode.SetCustomStatus:
      submitActionTitle = "Set Status";
      navigationTitle = "Set Custom Status";
      break;
    case StatusFormMode.EditStatus:
      submitActionTitle = "Update Status";
      navigationTitle = "Edit Status";
      break;
    case StatusFormMode.CreateStatus:
      submitActionTitle = "Create Status";
      navigationTitle = "Create Status";
  }

  return (
    <Form
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitActionTitle} onSubmit={props.onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="emoji"
        title="Emoji"
        defaultValue={props.status?.model.emojiCode || "speech_balloon"}
        storeValue={props.status ? false : true}
      >
        {Array.from(emojiCodeMap.keys()).map((emojiCode: string) => {
          return (
            <Form.Dropdown.Item
              key={emojiCode}
              title={`${emojiCodeMap.get(emojiCode)}  ${emojiCode}`}
              value={emojiCode}
            />
          );
        })}
      </Form.Dropdown>

      <Form.TextField
        id="statusText"
        title="Status"
        placeholder="What's your status?"
        defaultValue={props.status?.title}
      />

      <Form.Dropdown
        id={"clearAfter"}
        title={props.mode == StatusFormMode.SetCustomStatus ? "Clear After" : "Duration"}
        defaultValue={props.status?.duration}
        storeValue={props.status ? false : true}
      >
        <Form.Dropdown.Item key={"never"} title="Don't clear" value="" />
        <Form.Dropdown.Item key={"thirty_minutes"} title="30 minutes" value="thirty_minutes" />
        <Form.Dropdown.Item key={"one_hour"} title="1 hour" value="one_hour" />
        <Form.Dropdown.Item key={"four_hours"} title="4 hours" value="four_hours" />
        <Form.Dropdown.Item key={"today"} title="Today" value="today" />
        <Form.Dropdown.Item key={"this_week"} title="This week" value="this_week" />
      </Form.Dropdown>
    </Form>
  );
}
