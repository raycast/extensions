import { Color, Icon, List } from "@raycast/api";
import { openSettings, SETTINGS } from "./fixes";
import { RccList } from "./rcc-list";
import { RowActions } from "./resolve";
import {
	isNoise,
	parseNetwork,
	primaryAddress,
	type NetworkReport,
} from "./network-json";

function Rows({ n, actions }: { n: NetworkReport; actions: React.ReactNode }) {
	// A VPN, a proxy or a DNS server is not wrong, it is chosen — and every one
	// of them is changed in the same place. So Enter opens Network settings from
	// any row that stands for a setting, and Cmd+Enter does the same: there is
	// no batch here, there is one pane.
	const net = {
		title: "Open Network Settings",
		command: openSettings(SETTINGS.network),
		detail: "VPNs, proxies and DNS servers are all set here.",
		count: 1,
	};
	const row = <RowActions one={net} all={net} shared={actions} />;
	const real = n.interfaces.filter((i) => !isNoise(i));
	const loopback = n.interfaces.filter(isNoise);
	// "unknown" is the tool not answering, which is neither on nor off: the
	// old row painted it red as "disabled".
	const firewallTint =
		n.firewall.application === "enabled"
			? Color.Green
			: n.firewall.application === "disabled"
				? Color.Red
				: Color.SecondaryText;
	const firewallIcon =
		n.firewall.application === "enabled"
			? Icon.Shield
			: n.firewall.application === "disabled"
				? Icon.ExclamationMark
				: Icon.QuestionMarkCircle;
	return (
		<>
			<List.Section title="Addresses" subtitle={`${real.length}`}>
				{real.map((i, index) => (
					<List.Item
						key={`${i.name}-${i.family}-${index}`}
						icon={{ source: Icon.Globe, tintColor: Color.Green }}
						title={i.address}
						subtitle={i.name}
						accessories={[
							{ tag: { value: i.kind } },
							{ text: i.family },
						]}
						actions={row}
					/>
				))}
			</List.Section>

			{/* Something between you and the network, whether you meant it or not. */}
			{n.vpns.length > 0 || n.proxies.length > 0 ? (
				<List.Section title="In the way">
					{n.vpns.map((v) => (
						<List.Item
							key={`vpn-${v.name}`}
							icon={{
								source: Icon.Lock,
								tintColor:
									v.state === "connected"
										? Color.Orange
										: Color.SecondaryText,
							}}
							title={v.name}
							subtitle="VPN"
							accessories={[
								{
									tag: {
										value: v.state,
										color:
											v.state === "connected"
												? Color.Orange
												: Color.SecondaryText,
									},
								},
							]}
							actions={row}
						/>
					))}
					{n.proxies.map((p) => (
						<List.Item
							key={`proxy-${p.name}`}
							icon={{
								source: Icon.Filter,
								tintColor: Color.Orange,
							}}
							title={p.name}
							subtitle={p.value}
							accessories={[
								{
									tag: {
										value: "proxy",
										color: Color.Orange,
									},
								},
							]}
							actions={row}
						/>
					))}
				</List.Section>
			) : null}

			<List.Section title="Name resolution" subtitle={`${n.dns.length}`}>
				{n.dns.map((server) => (
					<List.Item
						key={server}
						icon={{
							source: Icon.Book,
							tintColor: Color.SecondaryText,
						}}
						title={server}
						actions={row}
					/>
				))}
			</List.Section>

			<List.Section title="Status">
				<List.Item
					icon={{ source: firewallIcon, tintColor: firewallTint }}
					title="Application firewall"
					subtitle={
						n.firewall.application === "unknown"
							? "socketfilterfw did not answer"
							: undefined
					}
					accessories={[
						{
							tag: {
								value:
									n.firewall.application === "unknown"
										? "not checked"
										: n.firewall.application,
								color: firewallTint,
							},
						},
					]}
					actions={row}
				/>
				{/* pf needs administrator rights to read; without them rcc says
				    unknown, and that is worth a row rather than silence. */}
				<List.Item
					icon={{
						source: Icon.Shield,
						tintColor:
							n.firewall.pf === "enabled"
								? Color.Green
								: Color.SecondaryText,
					}}
					title="Packet filter (pf)"
					subtitle={
						n.firewall.pf === "unknown" || n.firewall.pf === ""
							? "needs administrator rights to read"
							: undefined
					}
					accessories={[
						{
							tag: {
								value:
									n.firewall.pf === "unknown" ||
									n.firewall.pf === ""
										? "not checked"
										: n.firewall.pf,
								color:
									n.firewall.pf === "enabled"
										? Color.Green
										: Color.SecondaryText,
							},
						},
					]}
					actions={row}
				/>
				<List.Item
					icon={{
						source: Icon.Network,
						tintColor: Color.SecondaryText,
					}}
					title="Established connections"
					accessories={[{ text: String(n.connections) }]}
					actions={row}
				/>
				{loopback.map((i, index) => (
					<List.Item
						key={`lo-${index}`}
						icon={{
							source: Icon.Circle,
							tintColor: Color.SecondaryText,
						}}
						title={i.address}
						subtitle={`${i.name} · ${i.kind}`}
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
			command="network"
			parse={parseNetwork}
			navigationTitle={(n) => {
				if (!n) return "Network";
				const primary = primaryAddress(n);
				return primary
					? `Network — ${primary.address} on ${primary.name}`
					: "Network — no routable address";
			}}
			searchBarPlaceholder="Search addresses, DNS, VPNs and proxies"
			emptyIcon={Icon.Globe}
			emptyTitle="Nothing on the network"
		>
			{(n, actions) => <Rows n={n} actions={actions} />}
		</RccList>
	);
}
