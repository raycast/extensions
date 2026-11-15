import { activate_layout, foreground_process_id, list_layouts, toggle_layout } from "rust:../../rust";

export interface RawLayout {
  id: string;
  title: string;
  active: boolean;
}

export async function getWindowsLayouts(): Promise<RawLayout[]> {
  return (await list_layouts()) as RawLayout[];
}

export async function getWindowsForegroundProcessId(): Promise<number> {
  return (await foreground_process_id()) as number;
}

export async function activateWindowsLayout(id: string, waitForForegroundPid = 0): Promise<void> {
  await activate_layout(id, waitForForegroundPid);
}

export async function toggleWindowsLayout(waitForForegroundPid = 0): Promise<RawLayout> {
  return (await toggle_layout(waitForForegroundPid)) as RawLayout;
}
