import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import * as array from "./array";

interface IdItem {
	id: string;
}

export function useRecents<T extends IdItem>(
	viewKey: string,
): {
	data: T[];
	addRecent: (item: T) => void;
	removeRecent: (item: T) => void;
} {
	const key = `recents:${viewKey}`;

	const [items, setItems] = useState<Map<string, T>>(new Map());

	useEffect(() => {
		async function load() {
			const items = JSON.parse(
				(await LocalStorage.getItem<string>(key)) ?? "[]",
			);

			setItems(itemsToMap(items));
		}

		load();
	}, []);

	function itemsToMap(items: T[]) {
		return array.toMap(items, (item) => [item.id, item]);
	}

	function updateLocalStorage(items: Map<string, T>) {
		LocalStorage.setItem(
			key,
			JSON.stringify(array.fromMap(items, (_, v) => v)),
		);
	}

	return {
		data: array.fromMap(items, (_, v) => v),
		addRecent: (item: T) => {
			setItems((items) => {
				const newItems = new Map(items);

				newItems.set(item.id, item);

				updateLocalStorage(newItems);

				return newItems;
			});
		},
		removeRecent: (item: T) => {
			setItems((items) => {
				const newItems = new Map(items);

				newItems.delete(item.id);

				updateLocalStorage(newItems);

				return newItems;
			});
		},
	};
}
