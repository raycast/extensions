import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fs from "fs";
import { cpus } from "os";
import { runShellScript } from "./utils";

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
    message: `Stopping ${service == "--all" ? "all services" : service}`,
  });
  toast.show();

  await runShellScript(`${brewPath} services stop ${service}`);

  if (service === "--all") {
    toast.style = Toast.Style.Success;
    toast.title = "Stopped All Services";
    toast.message = "Stopped all services";
    return;
  }

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
    message: `Starting ${service == "--all" ? "all services" : service}`,
  });
  toast.show();

  await runShellScript(`${brewPath} services start ${service}`);

  if (service === "--all") {
    toast.style = Toast.Style.Success;
    toast.title = "Started All Services";
    toast.message = "Started all services";
    return;
  }

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
    message: `Restarting ${service == "--all" ? "all services" : service}`,
  });
  toast.show();

  await runShellScript(`${brewPath} services restart ${service}`);

  if (service === "--all") {
    toast.style = Toast.Style.Success;
    toast.title = "Restarted All Services";
    toast.message = "Restarted all services";
    return;
  }

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
    message: `Running ${service == "--all" ? "all services" : service}`,
  });
  toast.show();

  await runShellScript(`${brewPath} services run ${service}`);

  const services = await getServices();

  if (service === "--all") {
    toast.style = Toast.Style.Success;
    toast.title = "Ran All Services";
    toast.message = "Ran all services";
    return;
  }

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
