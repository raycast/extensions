import {
  ActionPanel,
  ActionPanelItem,
  Color,
  CopyToClipboardAction,
  getPreferenceValues,
  Icon,
  ImageLike,
  List,
  ShowInFinderAction,
  showToast,
  Toast,
  ToastStyle,
} from "@raycast/api";
import { execaCommand } from "execa";
import { existsSync } from "fs";
import { cpus } from "os";

export type serviceType = { name: string; status: string; user: string; path: string };

const preferences: { brewPath: string } = getPreferenceValues();

const brewPath: string =
  preferences.brewPath && preferences.brewPath.length > 0
    ? preferences.brewPath
    : cpus()[0].model.includes("Apple")
    ? "/opt/homebrew/bin/brew"
    : "/usr/local/bin/brew";

export async function runShellScript(command: string) {
  const { stdout, stderr } = await execaCommand(command);
  return { stdout, stderr };
}

export async function getServices(): Promise<serviceType[]> {
  if (!existsSync(brewPath)) {
    await showToast(ToastStyle.Failure, "Brew Executable Not Found", `Is brew installed at ${brewPath}?`);
    return [];
  }
  const brewServicesData = await runShellScript(`${brewPath} services list`);

  const lines = brewServicesData.stdout.split("\n");
  if (lines.length <= 1) {
    showToast(ToastStyle.Failure, "Error Parsing Service Data", "There are no services.");
    return [];
  }
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].startsWith("Name")) {
      lines.splice(0, i + 1);
      break;
    }
  }

  const data: serviceType[] = [];
  for (const line of lines) {
    const split = line.trim().split(/ +/g);
    if (split.length < 2) {
      showToast(ToastStyle.Failure, "Error Parsing Service Data", "Service data could not be parsed.");
      return [];
    }
    let status = split[1];
    if (status === "none") status = "stopped";
    if (split.length !== 4 && split[1] === "started") status = "running";
    data.push({
      name: split[0],
      status: status,
      user: split.length === 4 ? split[2] : "",
      path: split.at(-1) ?? "",
    });
  }
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
  const toast = new Toast({
    style: ToastStyle.Animated,
    title: "Restarting Service",
    message: `Restarting ${service}`,
  });
  toast.show();
  await runShellScript(`${brewPath} services restart ${service}`);

  const data = await getServices();
  for (const d of data) {
    if (d.name === service) {
      if (d.status === "started" || d.status === "running") {
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
      if (d.status === "running") {
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
  if (status === "started" || status === "running") return { source: Icon.Checkmark, tintColor: Color.Green };
  else if (status === "stopped") return { source: Icon.XmarkCircle, tintColor: Color.Red };
  else return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
}

export function BrewActions(props: { data: serviceType }) {
  if (props.data.status === "started" || props.data.status === "running") {
    return (
      <ActionPanel>
        <ActionPanel.Section title="Manage Service">
          <ActionPanelItem title="Stop Service" onAction={() => stopService(props.data.name)} />
          <ActionPanelItem title="Restart Service" onAction={() => restartService(props.data.name)} />
        </ActionPanel.Section>
        <ActionPanel.Section title="Plist">
          <ShowInFinderAction title="Reveal Plist File in Finder" path={props.data.path} />
          <CopyToClipboardAction title="Copy Plist File Path" content={props.data.path} />
        </ActionPanel.Section>
      </ActionPanel>
    );
  } else if (props.data.status === "stopped") {
    return (
      <ActionPanel title="Manage Service">
        <ActionPanelItem title="Start Service" onAction={() => startService(props.data.name)} />
        <ActionPanelItem title="Run Service" onAction={() => runService(props.data.name)} />
      </ActionPanel>
    );
  } else {
    return (
      <ActionPanel title="Manage Service">
        <ActionPanelItem title="Stop Service" onAction={() => stopService(props.data.name)} />
        <ActionPanelItem title="Restart Service" onAction={() => restartService(props.data.name)} />
      </ActionPanel>
    );
  }
}

export function BrewItemList(props: { services: serviceType[] | undefined }) {
  return (
    <List isLoading={!props.services} searchBarPlaceholder="Search for services...">
      {(props.services ?? []).map((d) => (
        <List.Item
          id={d.name}
          key={d.name}
          title={d.name}
          subtitle={d.status}
          accessoryTitle={d.user}
          icon={createIcon(d.status)}
          actions={<BrewActions data={d} />}
        />
      ))}
    </List>
  );
}
