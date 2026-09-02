import { Color, Icon, List } from "@raycast/api";
import { forgetNetworks } from "./fixes";
import { RccList } from "./rcc-list";
import { RowActions } from "./resolve";
import { parseWifi } from "./simple-json";

export default function Command() {
	return (
		<RccList
			command="wifi"
			parse={parseWifi}
			navigationTitle={(w) =>
				w?.active_ssid ? `Wi-Fi — ${w.active_ssid}` : "Wi-Fi"
			}
			searchBarPlaceholder="Search saved networks"
			emptyIcon={Icon.Wifi}
			emptyTitle="No saved networks"
		>
			{(w, actions) => {
				// A remembered network is a name this Mac will rejoin on its
				// own, wherever it hears it. Forgetting is the only thing to
				// resolve here, and the network you are on is excluded from the
				// bulk form: Cmd+Enter should not drop you off the internet.
				const forgettable = w.known_networks.filter(
					(s) => s !== w.active_ssid,
				);
				const forgetAll =
					forgettable.length > 0
						? {
								title: `Forget ${forgettable.length} Networks`,
								command: forgetNetworks(
									w.interface,
									forgettable,
								),
								detail: `Keeps ${w.active_ssid || "the current network"}. Needs administrator rights.`,
								destructive: true,
								count: forgettable.length,
							}
						: undefined;
				return w.known_networks.map((ssid) => {
					// The one you are on is the one you are looking for.
					const active = ssid === w.active_ssid;
					return (
						<List.Item
							key={ssid}
							icon={{
								source: active ? Icon.Wifi : Icon.WifiDisabled,
								tintColor: active
									? Color.Green
									: Color.SecondaryText,
							}}
							title={ssid}
							subtitle={active ? w.interface : undefined}
							accessories={
								active
									? [
											{
												tag: {
													value: "Connected",
													color: Color.Green,
												},
											},
										]
									: []
							}
							actions={
								<RowActions
									one={{
										title: active
											? "Forget This Network and Disconnect"
											: "Forget This Network",
										command: forgetNetworks(w.interface, [
											ssid,
										]),
										detail: active
											? `${ssid} is the network you are on. Forgetting it disconnects you.`
											: "Needs administrator rights.",
										destructive: true,
									}}
									all={forgetAll}
									shared={actions}
								/>
							}
						/>
					);
				});
			}}
		</RccList>
	);
}
