import { LocalStorage } from "@raycast/api";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { TOTPModel } from "../src/cloud/model";
import { finishSignIn, signInWithPassword } from "../src/cloud/auth";
import { mapSecretsToJsonFormat } from "../src/helpers";
import { fixture, mockFetch, PASSWORD, response } from "./fixtures";
import { DEFAULT_API_ORIGIN } from "../src/cloud/server";
import { mockStorage } from "./storage";

jest.mock("node:fs");
jest.mock("node:fs/promises");
jest.mock("node:child_process", () => ({ execFileSync: jest.fn() }));

describe("cloud data boundaries", () => {
	it.each([DEFAULT_API_ORIGIN, "https://api.example.com"])(
		"syncs on %s without CLI, exports, saved decrypted entries, or saved codes",
		async (apiOrigin) => {
			const items = mockStorage();
			const fetchMock = mockFetch();
			const { authorization, snapshot } = await fixture();
			fetchMock.mockResolvedValueOnce(response({}, 404)).mockResolvedValueOnce(response({}));
			const context = await signInWithPassword("a@example.com", PASSWORD, apiOrigin);
			await finishSignIn(context, authorization, PASSWORD);
			fetchMock
				.mockResolvedValueOnce(response(snapshot.key))
				.mockResolvedValueOnce(response({ diff: snapshot.records }))
				.mockResolvedValueOnce(response({ diff: [] }));
			const model = new TOTPModel();
			try {
				await model.start();
				const [code] = mapSecretsToJsonFormat(model.state.entries);
				await model.tick();
				const writes = JSON.stringify((LocalStorage.setItem as jest.Mock).mock.calls);
				for (const forbidden of [
					PASSWORD,
					"JBSWY3DPEHPK3PXP",
					"Synthetic",
					"test@example.com",
					code.current_totp,
					code.next_totp,
				]) {
					expect(writes).not.toContain(forbidden);
				}

				expect(items.size).toBe(3); // Mode, session, and encrypted cache only.
				expect(execFileSync).not.toHaveBeenCalled();
				expect(readFileSync).not.toHaveBeenCalled();
				expect(writeFile).not.toHaveBeenCalled();
				expect(writeFileSync).not.toHaveBeenCalled();
			} finally {
				model.dispose();
			}
		}
	);
});
