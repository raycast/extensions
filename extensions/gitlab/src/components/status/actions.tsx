import { Action, ActionPanel, Color, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { gitlab } from "../../common";
import { Status } from "../../gitlabapi";
import { StatusFormPresetCreate, StatusFormPresetEdit, StatusFormSet } from "./form";
import { wipePresets, predefinedPresets } from "./presets";
import { clearDurations, clearDurationText, getClearDurationDate } from "./utils";
import { showFailureToast } from "@raycast/utils";

export function StatusSetCustomAction(props: {
  setCurrentStatus: React.Dispatch<React.SetStateAction<Status | undefined>>;
}) {
  return (
    <Action.Push
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
}) {
  if (props.status === undefined) {
    return null;
  }
  if (props.status.emoji || props.status.message) {
    const handle = async () => {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Clearing Status..." });
        await gitlab.clearUserStatus();
        showToast(Toast.Style.Success, "Status cleared");
        props.setCurrentStatus({ emoji: "", message: "" });
      } catch (error) {
        showFailureToast(error, { title: "Could not clear Status" });
      }
    };
    return <Action title="Clear Status" icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }} onAction={handle} />;
  }
  return null;
}

export function StatusPresetFactoryResetAction(props: { setPresets: React.Dispatch<React.SetStateAction<Status[]>> }) {
  const handle = async () => {
    try {
      await wipePresets();
      props.setPresets(predefinedPresets());
    } catch (error) {
      showFailureToast(error, { title: "Could not reset Presets" });
    }
  };
  return (
    <Action title="Preset Factory Reset" icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }} onAction={handle} />
  );
}

export function StatusPresetCreateAction(props: {
  presets: Status[];
  setPresets: React.Dispatch<React.SetStateAction<Status[]>>;
}) {
  const { push, pop } = useNavigation();
  return (
    <Action
      title="Create Status Preset"
      icon={{ source: Icon.Document, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
      onAction={() => {
        push(
          <StatusFormPresetCreate
            presets={props.presets}
            setPresets={props.setPresets}
            onFinish={async (newStatus: Status) => {
              props.setPresets(props.presets === undefined ? [newStatus] : [...props.presets, newStatus]);
              pop();
            }}
          />,
        );
      }}
    />
  );
}

export function StatusPresetSetAction(props: {
  status: Status;
  setCurrentStatus: React.Dispatch<React.SetStateAction<Status | undefined>>;
}) {
  const handle = async () => {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Setting Status..." });
      await gitlab.setUserStatus(props.status);
      showToast(Toast.Style.Success, "Status set");
      props.status.clear_status_at = getClearDurationDate(props.status.clear_status_after);
      props.setCurrentStatus(props.status);
    } catch (error) {
      showFailureToast(error, { title: "Could not set Status" });
    }
  };
  return <Action title="Set Status" icon={{ source: Icon.Pencil, tintColor: Color.PrimaryText }} onAction={handle} />;
}

export function StatusPresetSetWithDurationAction(props: {
  status: Status;
  setCurrentStatus: React.Dispatch<React.SetStateAction<Status | undefined>>;
}) {
  const handle = async (durationKey: string) => {
    const newStatus = { ...props.status, clear_status_after: durationKey };
    try {
      await showToast({ style: Toast.Style.Animated, title: "Setting Status..." });
      await gitlab.setUserStatus(newStatus);
      showToast(Toast.Style.Success, "Status set");
      newStatus.clear_status_at = getClearDurationDate(newStatus.clear_status_after);
      props.setCurrentStatus(newStatus);
    } catch (error) {
      showFailureToast(error, { title: "Could not set Status" });
    }
  };

  return (
    <ActionPanel.Submenu title="Set Status with Duration" icon={{ source: Icon.Clock, tintColor: Color.PrimaryText }}>
      {Object.keys(clearDurations).map((durationKey) => (
        <Action key={durationKey + "_"} title={clearDurationText(durationKey)} onAction={() => handle(durationKey)} />
      ))}
    </ActionPanel.Submenu>
  );
}

export function StatusPresetEditAction(props: {
  status: Status;
  presets: Status[];
  index: number;
  setPresets: React.Dispatch<React.SetStateAction<Status[]>>;
}) {
  const setStatus = async (newStatus: Status) => {
    try {
      if (props.index >= 0 && props.index < props.presets.length) {
        const nextPresets = [...props.presets];
        nextPresets[props.index] = newStatus;
        props.setPresets(nextPresets);
        pop();
      } else {
        throw Error("Preset index out of bounds");
      }
    } catch (error) {
      showFailureToast(error, { title: "Could not edit Preset" });
    }
  };
  const { push, pop } = useNavigation();
  return (
    <Action
      title="Edit Preset"
      icon={{ source: Icon.Pencil, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={() => {
        push(
          <StatusFormPresetEdit
            status={props.status}
            presets={props.presets}
            setPresets={props.setPresets}
            onFinish={setStatus}
          />,
        );
      }}
    />
  );
}

export function StatusPresetDeleteAction(props: {
  presets: Status[];
  index: number;
  setPresets: React.Dispatch<React.SetStateAction<Status[]>>;
}) {
  const handle = async () => {
    try {
      if (props.index >= 0 && props.index < props.presets.length) {
        props.setPresets(props.presets.filter((_, index) => index != props.index));
      } else {
        throw Error("Preset index out of bounds");
      }
    } catch (error) {
      showFailureToast(error, { title: "Could not remove Preset" });
    }
  };
  return (
    <Action
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
}) {
  if (props.index - 1 < 0) {
    return null;
  }
  const handle = () => {
    const nextPresets = [...props.presets];
    const temp = nextPresets[props.index - 1];
    nextPresets[props.index - 1] = nextPresets[props.index];
    nextPresets[props.index] = temp;
    props.setPresets(nextPresets);
    props.setSelectedId(`preset_${props.index - 1}`);
  };
  return (
    <Action
      title="Move up"
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
}) {
  if (props.index + 1 >= props.presets.length) {
    return null;
  }
  const handle = () => {
    const nextPresets = [...props.presets];
    const temp = nextPresets[props.index + 1];
    nextPresets[props.index + 1] = nextPresets[props.index];
    nextPresets[props.index] = temp;
    props.setPresets(nextPresets);
    props.setSelectedId(`preset_${props.index + 1}`);
  };
  return (
    <Action
      title="Move Down"
      onAction={handle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
      icon={{ source: Icon.ChevronDown, tintColor: Color.PrimaryText }}
    />
  );
}
