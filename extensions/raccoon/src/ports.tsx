import {
	Action,
	ActionPanel,
	Color,
	Icon,
	Keyboard,
	List,
	openExtensionPreferences,
	useNavigation,
} from "@raycast/api";
import { useExec } from "@raycast/utils";
import { JSON_TIMEOUT_MS, readJson } from "./json-out.ts";
import { useMemo } from "react";
import { killPids, portsAsRoot } from "./fixes";
import { ResolveActions } from "./resolve";
import { findCommand } from "./commands";
import { MissingRcc, REPO_URL } from "./missing-rcc";
import {
	type Exposure,
	type Port,
	byInterest,
	exposure,
	parsePorts,
} from "./ports-json";
import { RccDetail } from "./rcc-detail";
import { RccNotFoundError, resolveRcc, RUNTIME_PATH } from "./rcc";

const TINT: Record<Exposure, Color> = {
	exposed: Color.Orange,
	local: Color.Green,
	connected: Color.Blue,
	idle: Color.SecondaryText,
};

const ICON: Record<Exposure, Icon> = {
	exposed: Icon.Globe,
	local: Icon.House,
	connected: Icon.Link,
	idle: Icon.Circle,
};

const LABEL: Record<Exposure, string> = {
	exposed: "Reachable",
	local: "This Mac only",
	connected: "Connected",
	idle: "Not bound",
};

export default function Command() {
	const { push } = useNavigation();

	let rccPath: string | null = null;
	let resolveError: unknown;
	try {
		rccPath = resolveRcc();
	} catch (error) {
		resolveError = error;
	}

	const { isLoading, data, error, revalidate } = useExec(
		rccPath ?? "rcc",
		["ports", "--json"],
		{
			execute: rccPath !== null,
			env: { ...process.env, NO_COLOR: "1", PATH: RUNTIME_PATH },
			timeout: JSON_TIMEOUT_MS,
			parseOutput: readJson("ports", parsePorts),
		},
	);

	// Reachable first: an open door matters more than a conversation in progress.
	const ports = useMemo(() => [...(data ?? [])].sort(byInterest), [data]);
	const reachable = ports.filter((p) => exposure(p) === "exposed").length;

	if (resolveError instanceof RccNotFoundError) return <MissingRcc />;

	// Closing a port means stopping whatever is holding it open; there is no
	// other way to close one. The bulk form takes only the ports reachable from
	// off this Mac — those are the ones that are a decision rather than a
	// detail, and quitting every listener on the machine would take loopback
	// services down with them.
	const exposedWithPid = ports.filter(
		(p) => exposure(p) === "exposed" && p.pid !== null,
	);
	const closeAll =
		exposedWithPid.length > 0
			? {
					title: `Close ${exposedWithPid.length} Reachable Ports`,
					command: killPids(
						exposedWithPid.map((p) => p.pid as number),
					),
					detail: exposedWithPid
						.map((p) => `${p.port} — ${p.process}`)
						.join("\n"),
					destructive: true,
					count: exposedWithPid.length,
				}
			: undefined;

	const actions = (port: Port | null) => (
		<ActionPanel>
			<ResolveActions
				one={
					port && port.pid !== null
						? {
								title: `Close Port ${port.port}`,
								command: killPids([port.pid]),
								detail: `Quits ${port.process} (pid ${port.pid}), which is what is holding ${port.port} open.`,
								destructive: true,
							}
						: undefined
				}
				all={closeAll}
			>
				{port ? (
					<>
						<Action.CopyToClipboard
							title="Copy Port"
							content={port.port}
							shortcut={Keyboard.Shortcut.Common.Copy}
						/>
						<Action.CopyToClipboard
							title="Copy Address"
							content={port.address}
						/>
						{port.pid !== null ? (
							<Action.CopyToClipboard
								title="Copy PID"
								content={String(port.pid)}
							/>
						) : null}
					</>
				) : null}
				<Action
					title="Run Again"
					icon={Icon.ArrowClockwise}
					shortcut={Keyboard.Shortcut.Common.Refresh}
					onAction={revalidate}
				/>
				<Action
					title="Show Raw Output"
					icon={Icon.Text}
					shortcut={{ modifiers: ["cmd"], key: "t" }}
					onAction={() =>
						push(<RccDetail command={findCommand("ports")} />)
					}
				/>
				<Action
					title="Set Rcc Path"
					icon={Icon.Gear}
					onAction={openExtensionPreferences}
				/>
				<Action.OpenInBrowser
					title="Open Raccoon on GitHub"
					url={REPO_URL}
				/>
			</ResolveActions>
		</ActionPanel>
	);

	if (error) {
		return (
			<List>
				<List.EmptyView
					icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
					title="The port list could not be read"
					description={error.message}
					actions={actions(null)}
				/>
			</List>
		);
	}

	return (
		<List
			isLoading={isLoading}
			navigationTitle={
				ports.length > 0
					? `Ports — ${reachable} reachable, ${ports.length} sockets`
					: "Ports"
			}
			searchBarPlaceholder="Search by port, process or address"
		>
			<List.EmptyView
				icon={{ source: Icon.Plug, tintColor: Color.SecondaryText }}
				title={isLoading ? "Reading open ports" : "No ports open"}
				actions={actions(null)}
			/>
			{/* Not a row from rcc: what rcc, as this user, cannot see. */}
			{!isLoading && rccPath ? (
				<List.Item
					key="scope"
					icon={{ source: Icon.Eye, tintColor: Color.SecondaryText }}
					title="Sockets of other users are not listed"
					subtitle="lsof shows only yours without administrator rights: root's sshd on 22 would be missing here"
					actions={
						<ActionPanel>
							<ResolveActions
								one={{
									title: "List Every User's Ports in Terminal",
									command: portsAsRoot(rccPath),
									detail: "Runs rcc ports with sudo. Terminal asks for your password or Touch ID.",
								}}
							>
								{actions(null).props.children}
							</ResolveActions>
						</ActionPanel>
					}
				/>
			) : null}
			{ports.map((port, index) => {
				const e = exposure(port);
				return (
					<List.Item
						key={`${port.port}-${port.proto}-${port.pid}-${index}`}
						icon={{ source: ICON[e], tintColor: TINT[e] }}
						title={port.port === "*" ? "unbound" : port.port}
						subtitle={port.process}
						keywords={[
							port.address,
							port.proto,
							port.state,
							port.user,
						].filter(Boolean)}
						accessories={[
							port.state ? { text: port.state } : {},
							{ tag: { value: LABEL[e], color: TINT[e] } },
						]}
						actions={actions(port)}
					/>
				);
			})}
		</List>
	);
}
