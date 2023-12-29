import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

export function useRaycastLocalStorage<T extends LocalStorage.Value = string>(key: string) {
	const [value, setInternalValue] = useState<T>();

	async function getCachedValue() {
		const cachedValue = await LocalStorage.getItem<T>(key);
		if (!cachedValue) return;
		setInternalValue(cachedValue);
	}

	function setValue(value: T) {
		setInternalValue(value);
		LocalStorage.setItem(key, value);
	}

	useEffect(() => {
		getCachedValue();
	}, []);

	function refresh() {
		return LocalStorage.removeItem(key);
	}

	return [value, setValue, refresh] as const;
}
