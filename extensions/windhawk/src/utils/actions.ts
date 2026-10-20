import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { runElevatedCommand } from "./admin-worker";

export async function enableMod(id: string): Promise<boolean> {
  try {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Enabling ${id}…` });

    await runElevatedCommand("enable", id);

    await toast.hide();
    await toast.show();
    toast.style = Toast.Style.Success;
    toast.title = `Enabled ${id}`;
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not enable ${id}` });
    return false;
  }
}

export async function disableMod(id: string): Promise<boolean> {
  try {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Disabling ${id}…` });

    await runElevatedCommand("disable", id);

    await toast.hide();
    await toast.show();
    toast.style = Toast.Style.Success;
    toast.title = `Disabled ${id}`;
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not disable ${id}` });
    return false;
  }
}

export async function installMod(id: string, version?: string | undefined): Promise<boolean> {
  try {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Installing ${id}…` });

    await runElevatedCommand("install", id, version);

    toast.style = Toast.Style.Success;
    toast.title = `Installed ${id}`;
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not install ${id}` });
    return false;
  }
}

export async function updateMod(id: string): Promise<boolean> {
  try {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Updating ${id}…` });

    await runElevatedCommand("update", id);

    toast.style = Toast.Style.Success;
    toast.title = `Updated ${id}`;
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not update ${id}` });
    return false;
  }
}

export async function uninstallMod(id: string): Promise<boolean> {
  try {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Uninstalling ${id}…` });

    await runElevatedCommand("uninstall", id);

    toast.style = Toast.Style.Success;
    toast.title = `Uninstalled ${id}`;
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not uninstall ${id}` });
    return false;
  }
}
