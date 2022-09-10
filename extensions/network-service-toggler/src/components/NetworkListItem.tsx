import { Action, ActionPanel, Color, Icon, List } from "@raycast/api"

import { ChangeState, Network } from "../types"

export const NetworkListItem = ({
	changeState,
	network,
}: {
	network: Network
	changeState: (mode: ChangeState) => Promise<void>
}) => (
	<List.Item
		id={network.name}
		key={network.name}
		title={network.name}
		icon={{ source: Icon.Network, tintColor: network.isEnabled ? Color.Blue : undefined }}
		detail={<List.Item.Detail markdown={network.detail} />}
		accessories={
			network.isConnected ? [{ icon: Icon.FullSignal, tooltip: "Network is connected and has an IP address" }] : []
		}
		actions={
			<ActionPanel>
				{network.isEnabled ? (
					<Action icon={Icon.WifiDisabled} title="Disable Network" onAction={() => changeState(ChangeState.DISABLE)} />
				) : (
					<Action icon={Icon.Bolt} title="Enable Network" onAction={() => changeState(ChangeState.ENABLE)} />
				)}
				<Action icon={Icon.RotateClockwise} title="Toggle Network" onAction={() => changeState(ChangeState.TOGGLE)} />
			</ActionPanel>
		}
	/>
)
