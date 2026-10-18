import { Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { ensureIcons } from "../helpers/icons";
import { JsonFormat } from "../helpers/types";

export function useCodeIcons(items: JsonFormat[]) {
	const [, setIconVersion] = useState(0);
	const services = items.map((item) => item.service_name);
	usePromise(ensureIcons, [services], {
		execute: services.length > 0,
		onError: () => undefined,
	});

	async function refreshIcons() {
		const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing icons" });

		try {
			await ensureIcons(services, true);
			setIconVersion((value) => value + 1);
			toast.style = Toast.Style.Success;
			toast.title = "Icons refreshed";
		} catch {
			toast.style = Toast.Style.Failure;
			toast.title = "Icons could not be refreshed";
		}
	}

	return { refreshIcons };
}
