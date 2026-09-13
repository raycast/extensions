import { Color, Icon, List } from "@raycast/api";
import { clearDerivedData, openApp, shutdownSimulators } from "./fixes";
import { RccList } from "./rcc-list";
import { RowActions } from "./resolve";
import {
	derivedLevel,
	humanBytes,
	parseXcode,
	type XcodeReport,
} from "./xcode-json";

const DERIVED_TINT = {
	empty: Color.SecondaryText,
	ok: Color.Green,
	large: Color.Orange,
} as const;

function Rows({ x, actions }: { x: XcodeReport; actions: React.ReactNode }) {
	// Two things here cost something and can be given back: the build cache,
	// and simulators left running. Cmd+Enter does both at once, because that is
	// what "reclaim what Xcode is holding" means.
	const booted = x.simulators.filter((s) => s.booted);
	const reclaimable = x.derived_data.bytes > 0 || booted.length > 0;
	const reclaimAll = reclaimable
		? {
				title: "Reclaim Everything Shown",
				command: `${shutdownSimulators()}; ${clearDerivedData()}`,
				detail: [
					x.derived_data.bytes > 0
						? `DerivedData: ${humanBytes(x.derived_data.bytes)}`
						: null,
					booted.length > 0
						? `${booted.length} booted ${booted.length === 1 ? "simulator" : "simulators"}`
						: null,
				]
					.filter(Boolean)
					.join(" · "),
				destructive: true,
				count: (x.derived_data.bytes > 0 ? 1 : 0) + booted.length,
			}
		: undefined;
	if (!x.installed) {
		return (
			<List.Item
				icon={{
					source: Icon.XMarkCircle,
					tintColor: Color.SecondaryText,
				}}
				title="Xcode is not installed"
				subtitle="Install it from the App Store to see simulators and build caches"
				actions={<RowActions shared={actions} />}
			/>
		);
	}
	const level = derivedLevel(x.derived_data.bytes);
	return (
		<>
			{/* The only thing here anyone deletes. */}
			<List.Section title="Reclaimable">
				<List.Item
					icon={{
						source: Icon.Trash,
						tintColor: DERIVED_TINT[level],
					}}
					title="DerivedData"
					subtitle={
						x.derived_data.present
							? `${x.derived_data.projects} ${x.derived_data.projects === 1 ? "project" : "projects"}`
							: "not created yet"
					}
					accessories={[
						{
							tag: {
								value: humanBytes(x.derived_data.bytes),
								color: DERIVED_TINT[level],
							},
						},
					]}
					actions={
						<RowActions
							one={
								x.derived_data.bytes > 0
									? {
											title: "Delete DerivedData",
											command: clearDerivedData(),
											detail: `Frees ${humanBytes(x.derived_data.bytes)}. Xcode rebuilds it, so the next build of each project is a full one.`,
											destructive: true,
										}
									: undefined
							}
							all={reclaimAll}
							shared={actions}
						/>
					}
				/>
			</List.Section>

			{/* A simulator left booted holds memory until someone shuts it down, so
			    the running ones are separated from the merely installed. */}
			{booted.length > 0 ? (
				<List.Section title="Running now" subtitle={`${booted.length}`}>
					{booted.map((s) => (
						<List.Item
							key={`booted-${s.name}`}
							icon={{
								source: Icon.Mobile,
								tintColor: Color.Orange,
							}}
							title={s.name}
							accessories={[
								{
									tag: {
										value: "booted",
										color: Color.Orange,
									},
								},
							]}
							actions={
								<RowActions
									one={{
										title: "Shut Down Booted Simulators",
										command: shutdownSimulators(),
										detail: "simctl shuts them down by state, not one by one, so this stops every booted simulator.",
										destructive: true,
									}}
									all={reclaimAll}
									shared={actions}
								/>
							}
						/>
					))}
				</List.Section>
			) : null}

			<List.Section
				title="Simulators"
				subtitle={`${x.simulators.length} installed`}
			>
				{x.simulators
					.filter((s) => !s.booted)
					.map((s, i) => (
						<List.Item
							key={`sim-${s.name}-${i}`}
							icon={{
								source: Icon.Mobile,
								tintColor: Color.SecondaryText,
							}}
							title={s.name}
							actions={
								<RowActions all={reclaimAll} shared={actions} />
							}
						/>
					))}
			</List.Section>

			<List.Section title="Installed">
				<List.Item
					icon={{
						source: Icon.Hammer,
						tintColor: Color.SecondaryText,
					}}
					title="Xcode"
					subtitle={x.build ? `build ${x.build}` : undefined}
					accessories={[{ text: x.version ?? "unknown version" }]}
					actions={
						<RowActions
							one={{
								title: "Open Xcode",
								command: openApp("Xcode"),
							}}
							all={reclaimAll}
							shared={actions}
						/>
					}
				/>
				{x.platforms.map((p) => (
					<List.Item
						key={`plat-${p}`}
						icon={{
							source: Icon.Layers,
							tintColor: Color.SecondaryText,
						}}
						title={p}
						actions={
							<RowActions all={reclaimAll} shared={actions} />
						}
					/>
				))}
			</List.Section>
		</>
	);
}

export default function Command() {
	return (
		<RccList
			command="xcode"
			parse={parseXcode}
			navigationTitle={(x) => {
				if (!x || !x.installed) return "Xcode";
				const size = humanBytes(x.derived_data.bytes);
				return `Xcode ${x.version ?? ""} — DerivedData ${size}`.replace(
					"  ",
					" ",
				);
			}}
			searchBarPlaceholder="Search simulators and platforms"
			emptyIcon={Icon.Hammer}
			emptyTitle="Nothing from Xcode"
		>
			{(x, actions) => <Rows x={x} actions={actions} />}
		</RccList>
	);
}
