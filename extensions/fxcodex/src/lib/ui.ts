import { Icon, Image, Toast, showToast } from "@raycast/api";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { invoke } from "./client";

export async function mutate(args: string[], title: string, onChange: () => void): Promise<void> {
	const toast = await showToast({ style: Toast.Style.Animated, title });
	try {
		const result = await invoke<unknown>(args);
		toast.style = Toast.Style.Success;
		toast.title = "Done";
		if (result.warnings.length > 0) toast.message = result.warnings.map((warning) => warning.message).join("\n");
		onChange();
	} catch (error) {
		toast.style = Toast.Style.Failure;
		toast.title = "fxCodex Failed";
		toast.message = error instanceof Error ? error.message : String(error);
		throw error;
	}
}

export function applicationDisplayName(applicationURL: string | null): string {
	if (!applicationURL) return "Not Found";
	const name = basename(filesystemPath(applicationURL));
	return name.endsWith(".app") ? name.slice(0, -4) : name;
}

export function applicationIcon(applicationURL: string | null | undefined): Image.ImageLike {
	return applicationURL ? { fileIcon: filesystemPath(applicationURL) } : Icon.AppWindow;
}

export function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

export function filesystemPath(value: string): string {
	try {
		const url = new URL(value);
		return url.protocol === "file:" ? fileURLToPath(url) : value;
	} catch {
		return value;
	}
}
