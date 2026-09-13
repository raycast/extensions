import { Color, Icon, List } from "@raycast/api";
import { dockerPrune, openApp } from "./fixes";
import { RccList } from "./rcc-list";
import { RowActions } from "./resolve";
import { containerState, parseDocker, type DockerReport } from "./docker-json";

const STATE_TINT = {
	up: Color.Green,
	exited: Color.SecondaryText,
	other: Color.Orange,
} as const;

function Rows({ d, actions }: { d: DockerReport; actions: React.ReactNode }) {
	// Docker's reclaimable disk is stopped containers, dangling images and
	// unused volumes, and `system prune --volumes` is exactly that set — so the
	// row-level and screen-level answers are the same command. It is offered
	// only while the daemon is up, because it needs one.
	const prune = d.running
		? {
				title: "Reclaim Unused Docker Disk",
				command: dockerPrune(),
				detail: "Removes stopped containers, dangling images and unused volumes. Running containers are untouched.",
				destructive: true,
				count: 1,
			}
		: undefined;
	const row = <RowActions one={prune} all={prune} shared={actions} />;
	// Absence is the whole answer, so it is one row and not an empty screen.
	if (!d.installed) {
		return (
			<List.Item
				icon={{
					source: Icon.XMarkCircle,
					tintColor: Color.SecondaryText,
				}}
				title="Docker is not installed"
				subtitle="Install Docker Desktop to see images, containers and volumes"
				actions={<RowActions shared={actions} />}
			/>
		);
	}
	if (!d.running) {
		return (
			<List.Item
				icon={{ source: Icon.Pause, tintColor: Color.Orange }}
				title="Docker is installed but not running"
				subtitle="Start Docker Desktop, then run this again"
				accessories={[
					{ tag: { value: "Stopped", color: Color.Orange } },
				]}
				actions={
					<RowActions
						one={{
							title: "Open Docker Desktop",
							command: openApp("Docker"),
						}}
						shared={actions}
					/>
				}
			/>
		);
	}
	const running = d.containers.filter(
		(c) => containerState(c.status) === "up",
	).length;
	return (
		<>
			<List.Section title="Containers" subtitle={`${running} running`}>
				{d.containers.map((c) => {
					const state = containerState(c.status);
					return (
						<List.Item
							key={c.id}
							icon={{
								source: state === "up" ? Icon.Play : Icon.Stop,
								tintColor: STATE_TINT[state],
							}}
							title={c.image}
							subtitle={c.id}
							accessories={[
								{
									tag: {
										value: c.status,
										color: STATE_TINT[state],
									},
								},
							]}
							actions={row}
						/>
					);
				})}
			</List.Section>
			<List.Section title="Images" subtitle={`${d.images.length}`}>
				{d.images.map((i) => (
					<List.Item
						key={`${i.repository}:${i.tag}`}
						icon={{
							source: Icon.Box,
							tintColor: Color.SecondaryText,
						}}
						title={i.repository}
						subtitle={i.tag}
						accessories={[{ text: i.size }]}
						actions={row}
					/>
				))}
			</List.Section>
			<List.Section title="Volumes" subtitle={`${d.volumes.length}`}>
				{d.volumes.map((v) => (
					<List.Item
						key={v.name}
						icon={{
							source: Icon.HardDrive,
							tintColor: Color.SecondaryText,
						}}
						title={v.name}
						accessories={[{ text: v.driver }]}
						actions={row}
					/>
				))}
			</List.Section>
			<List.Section title="Disk">
				{d.space.map((s) => (
					<List.Item
						key={s.type}
						icon={{
							source: Icon.Coin,
							// Reclaimable space is the only thing here worth acting on.
							tintColor:
								s.reclaimable && !s.reclaimable.startsWith("0")
									? Color.Orange
									: Color.SecondaryText,
						}}
						title={s.type}
						accessories={[
							{ text: s.size },
							...(s.reclaimable
								? [
										{
											tag: {
												value: `${s.reclaimable} reclaimable`,
											},
										},
									]
								: []),
						]}
						actions={row}
					/>
				))}
			</List.Section>
		</>
	);
}

export default function Command() {
	return (
		<RccList
			command="docker"
			parse={parseDocker}
			navigationTitle={(d) =>
				!d || !d.installed
					? "Docker"
					: `Docker — ${d.containers.length} containers, ${d.images.length} images`
			}
			searchBarPlaceholder="Search containers, images and volumes"
			emptyIcon={Icon.Box}
			emptyTitle="Nothing from Docker"
		>
			{(d, actions) => <Rows d={d} actions={actions} />}
		</RccList>
	);
}
