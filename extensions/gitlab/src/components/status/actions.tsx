import { ActionPanel, Color, Icon, PushAction, showToast, ToastStyle, useNavigation } from "@raycast/api";
import { gitlab } from "../../common";
import { Status } from "../../gitlabapi";
import { getErrorMessage } from "../../utils";
import { StatusFormPresetCreate, StatusFormPresetEdit, StatusFormSet } from "./form";
import { wipePresets, predefinedPresets } from "./presets";
import { clearDurations, clearDurationText, getClearDurationDate } from "./utils";

export function StatusSetCustomAction(props: {
  setCurrentStatus: React.Dispatch<React.SetStateAction<Status | undefined>>;
}): JSX.Element {
  return (
    <PushAction
      title="Set Custom Status"
      icon={{ source: Icon.Document, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<StatusFormSet setCurrentStatus={props.setCurrentStatus} />}
    />
  );
}

export function StatusClearCurrentAction(props: {
  status?: Status | undefined;
  setCurrentStatus: React.Dispatch<React.SetStateAction<Status | undefined>>;
}): JSX.Element | null {
  const status = props.status;
  if (status === undefined) {
    return null;
  }
  if (status.emoji || status.message) {
    const handle = async () => {
      try {
        await gitlab.clearUserStatus();
        props.setCurrentStatus({ emoji: "", message: "" });
      } catch (error) {
        showToast(ToastStyle.Failure, "Could not clear Status", getErrorMessage(error));
      }
    };
    return (
      <ActionPanel.Item
        title="Clear Status"
        icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
        onAction={handle}
      />
    );
  }
  return null;
}

export function StatusPresetFactoryResetAction(props: {
  setPresets: React.Dispatch<React.SetStateAction<Status[]>>;
}): JSX.Element {
  const handle = async () => {
    try {
      await wipePresets();
      props.setPresets(predefinedPresets());
    } catch (error) {
      showToast(ToastStyle.Failure, "Could not reset Presets", getErrorMessage(error));
    }
  };
  return (
    <ActionPanel.Item
      title="Preset Factory Reset"
      icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
      onAction={handle}
    />
  );
}

export function StatusPresetCreateAction(props: {
  presets: Status[];
  setPresets: React.Dispatch<React.SetStateAction<Status[]>>;
}): JSX.Element {
  const presets = props.presets;
  const { push, pop } = useNavigation();
  return (
    <ActionPanel.Item
      title="Create Status Preset"
      icon={{ source: Icon.Document, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
      onAction={() => {
        push(
          <StatusFormPresetCreate
            presets={presets}
            setPresets={props.setPresets}
            onFinish={async (newStatus: Status) => {
              const np = presets === undefined ? [] : [...presets, newStatus];
              props.setPresets(np);
              pop();
            }}
          />
        );
      }}
    />
  );
}

export function StatusPresetSetAction(props: {
  status: Status;
  setCurrentStatus: React.Dispatch<React.SetStateAction<Status | undefined>>;
}): JSX.Element {
  const handle = async () => {
    try {
      await gitlab.setUserStatus(props.status);
      props.status.clear_status_at = getClearDurationDate(props.status.clear_status_after);
      props.setCurrentStatus(props.status);
    } catch (error) {
      showToast(ToastStyle.Failure, "Could not set Status", getErrorMessage(error));
    }
  };
  return (
    <ActionPanel.Item
      title="Set Status"
      icon={{ source: Icon.Pencil, tintColor: Color.PrimaryText }}
      onAction={handle}
    />
  );
}

export function StatusPresetSetWithDurationAction(props: {
  status: Status;
  setCurrentStatus: React.Dispatch<React.SetStateAction<Status | undefined>>;
}): JSX.Element {
  const handle = async (durationKey: string) => {
    try {
      const newStatus = { ...props.status, clear_status_after: durationKey };
      await gitlab.setUserStatus(newStatus);
      newStatus.clear_status_at = getClearDurationDate(newStatus.clear_status_after);
      props.setCurrentStatus(newStatus);
    } catch (error) {
      showToast(ToastStyle.Failure, "Could not set Status", getErrorMessage(error));
    }
  };

  return (
    <ActionPanel.Submenu title="Set Status with Duration" icon={{ source: Icon.Clock, tintColor: Color.PrimaryText }}>
      {Object.keys(clearDurations).map((k) => (
        <ActionPanel.Item key={k + "_"} title={clearDurationText(k)} onAction={() => handle(k)} />
      ))}
    </ActionPanel.Submenu>
  );
}

export function StatusPresetEditAction(props: {
  status: Status;
  presets: Status[];
  index: number;
  setPresets: React.Dispatch<React.SetStateAction<Status[]>>;
}): JSX.Element {
  const presets = props.presets;
  const index = props.index;
  const setStatus = async (newStatus: Status) => {
    try {
      if (index >= 0 && index < presets.length) {
        const np = [...presets];
        np[index] = newStatus;
        props.setPresets(np);
        pop();
      } else {
        throw Error("Preset index out of bounds");
      }
    } catch (error) {
      showToast(ToastStyle.Failure, "Could not edit Preset", getErrorMessage(error));
    }
  };
  const { push, pop } = useNavigation();
  return (
    <ActionPanel.Item
      title="Edit Preset"
      icon={{ source: Icon.Pencil, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={() => {
        push(
          <StatusFormPresetEdit
            status={props.status}
            presets={presets}
            setPresets={props.setPresets}
            onFinish={setStatus}
          />
        );
      }}
    />
  );
}

export function StatusPresetDeleteAction(props: {
  presets: Status[];
  index: number;
  setPresets: React.Dispatch<React.SetStateAction<Status[]>>;
}): JSX.Element {
  const presets = props.presets;
  const index = props.index;
  const handle = async () => {
    try {
      if (index >= 0 && index < presets.length) {
        const np = presets.filter((_, i) => i != index);
        props.setPresets(np);
      } else {
        throw Error("Preset index out of bounds");
      }
    } catch (error) {
      showToast(ToastStyle.Failure, "Could not remove Preset", getErrorMessage(error));
    }
  };
  return (
    <ActionPanel.Item
      title="Delete Preset"
      icon={{ source: Icon.Trash, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["opt"], key: "x" }}
      onAction={handle}
    />
  );
}

export function StatusPresetMoveUpAction(props: {
  presets: Status[];
  index: number;
  setPresets: React.Dispatch<React.SetStateAction<Status[]>>;
  setSelectedId: React.Dispatch<React.SetStateAction<string | undefined>>;
}): JSX.Element | null {
  const index = props.index;
  if (index - 1 < 0) {
    return null;
  }
  const handle = () => {
    const np = [...props.presets];
    const temp = np[index - 1];
    np[index - 1] = np[index];
    np[index] = temp;
    props.setPresets(np);
    props.setSelectedId(`preset_${index - 1}`);
  };
  return (
    <ActionPanel.Item
      title="Move Up"
      onAction={handle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
      icon={{ source: Icon.ChevronUp, tintColor: Color.PrimaryText }}
    />
  );
}

export function StatusPresetMoveDownAction(props: {
  presets: Status[];
  index: number;
  setPresets: React.Dispatch<React.SetStateAction<Status[]>>;
  setSelectedId: React.Dispatch<React.SetStateAction<string | undefined>>;
}): JSX.Element | null {
  const index = props.index;
  const upperIndex = index + 1;
  if (upperIndex >= props.presets.length) {
    return null;
  }
  const handle = () => {
    const np = [...props.presets];
    const temp = np[upperIndex];
    np[upperIndex] = np[index];
    np[index] = temp;
    props.setPresets(np);
    props.setSelectedId(`preset_${upperIndex}`);
  };
  return (
    <ActionPanel.Item
      title="Move Down"
      onAction={handle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
      icon={{ source: Icon.ChevronDown, tintColor: Color.PrimaryText }}
    />
  );
}
