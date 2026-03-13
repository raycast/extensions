import { Alert, Color, Icon } from "@raycast/api";

const Alerts = {
  DeleteNamedPort(name: string): Alert.Options {
    return {
      title: "Delete Named Port",
      message: `Are you sure you want to delete "${name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };
  },
  KillParentProcess(process: { name?: string }): Alert.Options {
    return {
      title: `Kill Process${process.name ? ` ${process.name}` : ""}?`,
      icon: {
        source: Icon.ExclamationMark,
        tintColor: Color.Red,
      },
      message: "Killing some processes might crash apps or even your system",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Kill",
      },
      dismissAction: {
        style: Alert.ActionStyle.Cancel,
        title: "Cancel",
      },
    };
  },
} as const;

export default Alerts;
