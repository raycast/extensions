import { LocalStorage } from "@raycast/api";

export function mockStorage() {
	const items = new Map<string, string | number | boolean>();
	(LocalStorage.getItem as jest.Mock).mockImplementation(async (key: string) => items.get(key));
	(LocalStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
		items.set(key, value);
	});
	(LocalStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
		items.delete(key);
	});
	(LocalStorage.allItems as jest.Mock).mockImplementation(async () => Object.fromEntries(items));
	return items;
}
