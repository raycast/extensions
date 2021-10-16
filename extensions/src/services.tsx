import {
  ActionPanel,
  ActionPanelItem,
  ActionPanelProps,
  Color,
  CopyToClipboardAction,
  getPreferenceValues,
  Icon,
  ImageLike,
  ShowInFinderAction,
  showToast,
  Toast,
  ToastStyle,
} from "@raycast/api";
import { existsSync } from "fs";
import { cpus } from "os";
import { ReactElement } from "react";
import { runShellScript } from "./utils";

export type serviceType = { name: string, status: string, user: string, path: string };

const preferences: { brewPath: string } = getPreferenceValues();

const brewPath: string = (preferences.brewPath && preferences.brewPath.length > 0)
  ? preferences.brewPath
  : ((cpus()[0].model == "Apple M1") ? "/opt/homebrew/bin/brew" : "/usr/local/bin/brew");

export async function checkBrewInstallation() {
  if (!existsSync(brewPath)) {
    await showToast(ToastStyle.Failure, "Brew Executable Not Found", `Is brew installed at ${brewPath}?`);
  }
}

export async function getServices(): Promise<serviceType[]> {
  await checkBrewInstallation();
  const brewServicesData = await runShellScript(`${brewPath} services list`);
  const lines = brewServicesData.split("\n");

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("Name")) {
      lines.splice(0, i + 1);
      break;
    }
  }

  const data: serviceType[] = lines.map(l => {
    const split = l.trim().split(/ +/g);
    if (split.length < 2) {
      showToast(ToastStyle.Failure, "Error Parsing Service Data", "Service data could not be parsed.");
    }
    return {
      name: split[0],
      status: split[1],
      user: split[2] ?? "",
      path: split[3] ?? ""
    };
  });

  return data;
}

export async function stopService(service: string) {
  const toast = new Toast({ style: ToastStyle.Animated, title: "Stopping Service", message: `Stopping ${service}` });
  toast.show();
  await runShellScript(`${brewPath} services stop ${service}`);

  const data = await getServices();
  for (const d of data) {
    if (d.name === service) {
      if (d.status === "stopped") {
        toast.style = ToastStyle.Success;
        toast.title = "Stopped Service";
        toast.message = `Stopped ${service}`;
      } else {
        toast.style = ToastStyle.Failure;
        toast.title = "Error Stopping Service";
        toast.message = `${service} could not be stopped properly`;
      }
    }
  }
}

export async function startService(service: string) {
  const toast = new Toast({ style: ToastStyle.Animated, title: "Starting Service", message: `Starting ${service}` });
  toast.show();
  await runShellScript(`${brewPath} services start ${service}`);

  const data = await getServices();
  for (const d of data) {
    if (d.name === service) {
      if (d.status === "started") {
        toast.style = ToastStyle.Success;
        toast.title = "Started Service";
        toast.message = `Started ${service}`;
      } else {
        toast.style = ToastStyle.Failure;
        toast.title = "Error Starting Service";
        toast.message = `${service} could not be started properly`;
      }
    }
  }
}

export async function restartService(service: string) {
  const toast = new Toast({ style: ToastStyle.Animated, title: "Restarting Service", message: `Restarting ${service}` });
  toast.show();
  await runShellScript(`${brewPath} services restart ${service}`);

  const data = await getServices();
  for (const d of data) {
    if (d.name === service) {
      if (d.status === "started") {
        toast.style = ToastStyle.Success;
        toast.title = "Restarted Service";
        toast.message = `Restarted ${service}`;
      } else {
        toast.style = ToastStyle.Failure;
        toast.title = "Error Restarting Service";
        toast.message = `${service} could not be restarted properly`;
      }
    }
  }
}

export async function runService(service: string) {
  const toast = new Toast({ style: ToastStyle.Animated, title: "Running Service", message: `Running ${service}` });
  toast.show();
  await runShellScript(`${brewPath} services run ${service}`);

  const data = await getServices();
  for (const d of data) {
    if (d.name === service) {
      if (d.status === "started") {
        toast.style = ToastStyle.Success;
        toast.title = "Ran Service";
        toast.message = `Ran ${service}`;
      } else {
        toast.style = ToastStyle.Failure;
        toast.title = "Error Running Service";
        toast.message = `${service} could not be run properly`;
      }
    }
  }
}

export function createIcon(status: string): ImageLike {
  if (status === "started") {
    return {
      source: Icon.Checkmark,
      tintColor: Color.Green
    }
  } else if (status === "stopped") {
    return {
      source: Icon.XmarkCircle,
      tintColor: Color.Red
    }
  } else {
    return {
      source: Icon.ExclamationMark,
      tintColor: Color.Yellow
    }
  }
}

export function createActions(serviceData: serviceType): ReactElement<ActionPanelProps> {
  if (serviceData.status === "started") {
    return (
      <ActionPanel title="Manage Service">
        <ActionPanel.Section title="Service">
          <ActionPanelItem title={"Stop Service"} onAction={() => stopService(serviceData.name)} />
          <ActionPanelItem title={"Restart Service"} onAction={() => restartService(serviceData.name)} />
        </ActionPanel.Section>
        <ActionPanel.Section title="Plist">
          <ShowInFinderAction title={"Reveal Plist File in Finder"} path={serviceData.path} />
          <CopyToClipboardAction title={"Copy Plist File Path"} content={serviceData.path} />
        </ActionPanel.Section>
      </ActionPanel>
    );
  } else if (serviceData.status === "stopped") {
    return (
      <ActionPanel title="Manage Service">
        <ActionPanelItem title={"Start Service"} onAction={() => startService(serviceData.name)} />
        <ActionPanelItem title={"Run Service"} onAction={() => runService(serviceData.name)} />
      </ActionPanel>
    );
  } else {
    return (
      <ActionPanel title="Manage Service">
        <ActionPanelItem title={"Stop Service"} onAction={() => stopService(serviceData.name)} />
        <ActionPanelItem title={"Restart Service"} onAction={() => restartService(serviceData.name)} />
      </ActionPanel>
    );
  }
}
