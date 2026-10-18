import { LocalStorage, confirmAlert } from "@raycast/api";
import { removeImportedEntries } from "../src/helpers/removeImportedEntries";
import { STORAGE_KEY } from "../src/constants/secrets";
import { cacheKey } from "../src/cloud/storage";
import { mockStorage } from "./storage";

describe("import cleanup", () => {
	it.each([false, true])("removes imported data only after confirmation: %s", async (confirmed) => {
		const items = mockStorage();
		items.set(STORAGE_KEY, "legacy entries");
		items.set(cacheKey("synthetic"), "encrypted cache");
		(confirmAlert as jest.Mock).mockResolvedValueOnce(confirmed);
		const remove = jest.fn(() => LocalStorage.removeItem(STORAGE_KEY));
		await removeImportedEntries(remove);
		expect(remove).toHaveBeenCalledTimes(confirmed ? 1 : 0);
		expect(items.has(STORAGE_KEY)).toBe(!confirmed);
		expect(items.get(cacheKey("synthetic"))).toBe("encrypted cache");
		if (!confirmed) {
			expect(LocalStorage.removeItem).not.toHaveBeenCalled();
		}
	});
});
