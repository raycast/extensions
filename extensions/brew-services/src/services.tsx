import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { execaCommand } from "execa";
import fs from "fs";
import { cpus, homedir } from "os";

export type ServiceStatus = string;

export type Service = {
  name: string;
  status: ServiceStatus;
  user: string;
  path: string;
};

const preferences: { brewPath: string } = getPreferenceValues();

const brewPath: string =
  preferences.brewPath && preferences.brewPath.length > 0
    ? preferences.brewPath
    : cpus()[0].model.includes("Apple")
    ? "/opt/homebrew/bin/brew"
    : "/usr/local/bin/brew";

export async function runShellScript(command: string) {
  const { stdout } = await execaCommand(command);
  return stdout;
}

export async function getServices(): Promise<Service[]> {
  // make sure that brewPath exists, is a file, and is executable
  // after this, we can assume that brewPath is valid (unless the user modifies the executable at brewPath)
  if (!fs.existsSync(brewPath)) {
    await showToast(Toast.Style.Failure, "Brew Executable Not Found", `Is brew installed at ${brewPath}?`);
    return [];
  }

  let data = "";
  try {
    data = await runShellScript(`${brewPath} services list`);
  } catch (e) {
    await showToast(Toast.Style.Failure, "Error Fetching Service Data", `Is brew installed at ${brewPath}?`);
    return [];
  }

  if (data === undefined) {
    showToast(Toast.Style.Failure, "Error Parsing Service Data", "Service data could not be parsed.");
  }

  const lines = data!.split("\n");
  if (lines.length <= 1) {
    showToast(Toast.Style.Failure, "Error Parsing Service Data", "There are no services.");
    return [];
  }
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].startsWith("Name")) {
      lines.splice(0, i + 1);
      break;
    }
  }

  const res: Service[] = [];
  for (const line of lines) {
    const split = line.trim().split(/ +/g);
    if (split.length < 2) {
      showToast(Toast.Style.Failure, "Error Parsing Service Data", "Service data could not be parsed.");
      return [];
    }

    const status = split[1] as ServiceStatus;

    res.push({
      name: split[0],
      status: status,
      user: (split.length >= 4 && split.at(-2)) || "",
      path: split.at(-1) ?? "",
    });
  }
  return res;
}

export async function stopService(service: string) {
  const toast = new Toast({
    style: Toast.Style.Animated,
    title: "Stopping Service",
    message: `Stopping ${service}`,
  });
  toast.show();

  await runShellScript(`${brewPath} services stop ${service}`);

  const data = await getServices();
  for (const d of data) {
    if (d.name === service) {
      if (d.status === "stopped") {
        toast.style = Toast.Style.Success;
        toast.title = "Stopped Service";
        toast.message = `Stopped ${service}`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Error Stopping Service";
        toast.message = `${service} could not be stopped properly`;
      }
    }
  }
}

export async function startService(service: string) {
  const toast = new Toast({
    style: Toast.Style.Animated,
    title: "Starting Service",
    message: `Starting ${service}`,
  });
  toast.show();

  await runShellScript(`${brewPath} services start ${service}`);

  const data = await getServices();
  for (const d of data) {
    if (d.name === service) {
      if (d.status === "started") {
        toast.style = Toast.Style.Success;
        toast.title = "Started Service";
        toast.message = `Started ${service}`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Error Starting Service";
        toast.message = `${service} could not be started properly`;
      }
    }
  }
}

export async function restartService(service: string) {
  const toast = new Toast({
    style: Toast.Style.Animated,
    title: "Restarting Service",
    message: `Restarting ${service}`,
  });
  toast.show();

  await runShellScript(`${brewPath} services restart ${service}`);

  const data = await getServices();
  for (const d of data) {
    if (d.name === service) {
      if (d.status === "started" || d.status === "running") {
        toast.style = Toast.Style.Success;
        toast.title = "Restarted Service";
        toast.message = `Restarted ${service}`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Error Restarting Service";
        toast.message = `${service} could not be restarted properly`;
      }
    }
  }
}

export async function runService(service: string) {
  const toast = new Toast({
    style: Toast.Style.Animated,
    title: "Running Service",
    message: `Running ${service}`,
  });
  toast.show();

  await runShellScript(`${brewPath} services run ${service}`);

  const services = await getServices();

  const s = services.find((s) => s.name === service)!;
  if (s.status === "running") {
    toast.style = Toast.Style.Success;
    toast.title = "Ran Service";
    toast.message = `Ran ${service}`;
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = "Error Running Service";
    toast.message = `${service} could not be run properly`;
  }
}

export function createIcon(status: string): Image.ImageLike {
  switch (status) {
    case "started":
      return { source: Icon.Play, tintColor: Color.Green };
    case "running":
      return { source: Icon.PlayFilled, tintColor: Color.Green };
    case "error":
      return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
    case "none":
      return { source: Icon.Stop, tintColor: Color.PrimaryText };
    default:
      return { source: Icon.QuestionMark, tintColor: Color.Red };
  }
}

export function StopService(props: { name: string }) {
  return <Action icon={Icon.Stop} title="Stop Service" onAction={() => stopService(props.name)} />;
}

export function RestartService(props: { name: string }) {
  return <Action icon={Icon.RotateAntiClockwise} title="Restart Service" onAction={() => restartService(props.name)} />;
}

export function StartService(props: { name: string }) {
  return <Action icon={Icon.Play} title="Start Service" onAction={() => startService(props.name)} />;
}

export function RunService(props: { name: string }) {
  return <Action icon={Icon.ForwardFilled} title="Run Service" onAction={() => runService(props.name)} />;
}

export function PlistActions(props: { path: string }) {
  const path = props.path.replace(/^~/, homedir());
  return (
    <ActionPanel.Section title="Plist">
      <Action.ShowInFinder title="Show Plist File in Finder" path={path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
      <Action.OpenWith title="Open Plist File With" path={path} shortcut={Keyboard.Shortcut.Common.OpenWith} />
      <Action.CopyToClipboard
        title="Copy Plist File Path"
        content={path}
        shortcut={Keyboard.Shortcut.Common.CopyPath}
      />
    </ActionPanel.Section>
  );
}

export function BrewActions(props: { data: Service }) {
  if (props.data.status === "started" || props.data.status === "running") {
    return (
      <ActionPanel>
        <ActionPanel.Section title="Manage Service">
          <StopService name={props.data.name} />
          <RestartService name={props.data.name} />
        </ActionPanel.Section>
        <PlistActions path={props.data.path} />
      </ActionPanel>
    );
  } else if (props.data.status === "stopped" || props.data.status === "none") {
    return (
      <ActionPanel title="Manage Service">
        <StartService name={props.data.name} />
        <RunService name={props.data.name} />
      </ActionPanel>
    );
  } else {
    return (
      <ActionPanel title="Manage Service">
        <StopService name={props.data.name} />
        <RestartService name={props.data.name} />
      </ActionPanel>
    );
  }
}

export function BrewItemList(props: { services: Service[] | undefined }) {
  return (
    <List isLoading={!props.services} searchBarPlaceholder="Search for services...">
      {(props.services ?? []).map((d) => (
        <List.Item
          title={d.name}
          subtitle={d.status}
          accessories={d.user ? [{ text: d.user, icon: Icon.Person }] : undefined}
          icon={createIcon(d.status)}
          actions={<BrewActions data={d} />}
        />
      ))}
    </List>
  );
}
