import { readFileSync } from "node:fs";
import { join } from "node:path";

it("keeps sign-in and Get TOTP commands without a separate sign-out command", () => {
	const manifest = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"));
	const commands = manifest.commands.map((command: { name: string }) => command.name);
	expect(commands).toEqual(expect.arrayContaining(["index", "sign-in"]));
	expect(commands).not.toContain("sign-out");
});
