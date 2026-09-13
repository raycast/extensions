import { Color, Icon, List } from "@raycast/api";
import { forgetNetworks } from "./fixes";
import { RccList } from "./rcc-list";
import { RowActions } from "./resolve";
import { parseWifi, type WifiReport } from "./simple-json";

const HIDDEN_NOTE =
	"macOS withholds the current network's name from command-line tools without Location Services access.";

function title(w: WifiReport | undefined): string {
	if (!w) return "Wi-Fi";
	if (w.active_ssid) return `Wi-Fi — ${w.active_ssid}`;
	if (w.connected) return "Wi-Fi — connected, name withheld by macOS";
	return "Wi-Fi — not connected";
}

export default function Command() {
	return (
		<RccList
			command="wifi"
			parse={parseWifi}
			navigationTitle={title}
			searchBarPlaceholder="Search saved networks"
			emptyIcon={Icon.Wifi}
			emptyTitle="No saved networks"
		>
			{(w, actions) => {
				// A remembered network is a name this Mac will rejoin on its
				// own, wherever it hears it. Forgetting is the only thing to
				// resolve here, and the network you are on is excluded from the
				// bulk form: Cmd+Enter should not drop you off the internet.
				//
				// When macOS withholds the name, the current network cannot be
				// told apart from the rest, so there is no bulk form: "forget
				// everything but the one you are on" would be a promise this
				// screen cannot keep.
				const known = w.connected && w.active_ssid !== "";
				const forgettable = known
					? w.known_networks.filter((s) => s !== w.active_ssid)
					: w.connected
						? []
						: w.known_networks;
				const forgetAll =
					forgettable.length > 0
						? {
								title: `Forget ${forgettable.length} Networks`,
								command: forgetNetworks(
									w.interface,
									forgettable,
								),
								detail: known
									? `Keeps ${w.active_ssid}. Needs administrator rights.`
									: "Needs administrator rights.",
								destructive: true,
								count: forgettable.length,
							}
						: undefined;
				return (
					<>
						{w.connected && !w.active_ssid ? (
							<List.Item
								key="hidden"
								icon={{
									source: Icon.Wifi,
									tintColor: Color.Green,
								}}
								title="Connected, name withheld"
								subtitle={w.interface}
								accessories={[
									{
										tag: {
											value: "Connected",
											color: Color.Green,
										},
									},
								]}
								actions={<RowActions shared={actions} />}
								detail={
									<List.Item.Detail markdown={HIDDEN_NOTE} />
								}
							/>
						) : null}
						{w.known_networks.map((ssid) => {
							// The one you are on is the one you are looking for.
							const active = known && ssid === w.active_ssid;
							return (
								<List.Item
									key={ssid}
									icon={{
										source: active
											? Icon.Wifi
											: Icon.WifiDisabled,
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
												command: forgetNetworks(
													w.interface,
													[ssid],
												),
												detail: active
													? `${ssid} is the network you are on. Forgetting it disconnects you.`
													: w.connected &&
														  !w.active_ssid
														? `This may be the network you are on: ${HIDDEN_NOTE} Needs administrator rights.`
														: "Needs administrator rights.",
												destructive: true,
											}}
											all={forgetAll}
											shared={actions}
										/>
									}
								/>
							);
						})}
					</>
				);
			}}
		</RccList>
	);
}
