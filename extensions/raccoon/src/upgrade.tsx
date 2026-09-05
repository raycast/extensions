import { Icon } from "@raycast/api";
import { DryRunFirst } from "./dry-run-first";

/**
 * `rcc upgrade` — brew, pip, npm, pnpm, bun, uv, go, nvm, rustup, gem, docker,
 * claude, one after another. Opens in `--dry-run`, like `apps`: it is the
 * other command here that rewrites what is installed, and it used to start the
 * moment the screen opened.
 */
export default function Command() {
	return (
		<DryRunFirst
			command="upgrade"
			subject="Packages"
			unit="package managers"
			idleIcon={Icon.Download}
			confirm={{
				title: "Upgrade the packages of every manager on this Mac?",
				message:
					"Raccoon will run the brew, pip, npm, pnpm, bun, uv, go, nvm, " +
					"rustup, gem and Docker upgrades in turn. Tools you are using may " +
					"change version under you, and some managers ask for Touch ID.",
				action: "Upgrade Packages",
			}}
		/>
	);
}
