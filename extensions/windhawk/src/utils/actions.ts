import { showToast, Toast } from "@raycast/api";
import { getCliPath } from "./helpers";
import { showFailureToast } from "@raycast/utils";
import { runElevatedCommand } from "./admin-worker";

const cliPath = getCliPath();

export async function enableMod(id: string) {
  try {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Enabling ${id}…` });

    await runElevatedCommand(`& "${cliPath}" mod enable ${id}`);

    await toast.hide();
    await toast.show();
    toast.style = Toast.Style.Success;
    toast.title = `Enabled ${id}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not enable ${id}` });
  }
}

export async function disableMod(id: string) {
  try {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Disabling ${id}…` });

    await runElevatedCommand(`& "${cliPath}" mod disable ${id}`);

    await toast.hide();
    await toast.show();
    toast.style = Toast.Style.Success;
    toast.title = `Disabled ${id}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not disable ${id}` });
  }
}

export async function installMod(id: string, version?: string | undefined) {
  try {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Installing ${id}…` });

    await runElevatedCommand(`& "${cliPath}" mod install ${id}${version ? ` ${version}` : ""}`);

    toast.style = Toast.Style.Success;
    toast.title = `Installed ${id}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not instal ${id}` });
  }
}

export async function updateMod(id: string) {
  try {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Updating ${id}…` });

    await runElevatedCommand(`& "${cliPath}" mod update ${id}`);

    toast.style = Toast.Style.Success;
    toast.title = `Updated ${id}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not update ${id}` });
  }
}

export async function uninstallMod(id: string) {
  try {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Uninstalling ${id}…` });

    await runElevatedCommand(`& "${cliPath}" mod remove ${id} --yes`);

    toast.style = Toast.Style.Success;
    toast.title = `Uninstalled ${id}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not uninstall ${id}` });
  }
}
