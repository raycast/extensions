import { Icon } from "@raycast/api";
import { ProgressList } from "./progress-list";

/**
 * `rcc upgrade` — brew, pip, npm, pnpm, bun, uv, go, cargo, one after another.
 *
 * Nothing here but the shape: the screen is ProgressList, because `apps` is the
 * same command in a different domain and one of them having a better view than
 * the other would be an accident, not a decision.
 */
export default function Command() {
	return (
		<ProgressList
			args={["upgrade"]}
			title="Upgrade"
			unit="package managers"
			idleIcon={Icon.Download}
		/>
	);
}
