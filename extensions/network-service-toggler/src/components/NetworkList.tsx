import { useState, useEffect } from "react"
import { List } from "@raycast/api"

import { ChangeState, Network } from "../types"
import { listNetworks, changeNetworkState } from "../utils"
import { NetworkListItem } from "./NetworkListItem"
import { getPreferences } from "../preferences"
import isEqual from "lodash.isequal"

export const NetworkList = () => {
	const preferences = getPreferences()

	const [networks, setNetworks] = useState<Network[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const refreshNetworks = async (isLazy: boolean) => {
		if (!isLazy) setIsLoading(true)
		const newNetworks = await listNetworks()

		// prevent unnecessary list updates (interfers with copy, for example)
		if (!isEqual(networks, newNetworks)) setNetworks(newNetworks)

		if (!isLazy) setIsLoading(false)
	}

	const bindChangeState = (network: Network) => async (mode: ChangeState) =>
		await changeNetworkState({ mode, network, onChanged: () => refreshNetworks(false) })

	// refresh network list every once in a while
	useEffect(() => {
		refreshNetworks(false)
		const interval = setInterval(() => {
			refreshNetworks(true)
		}, preferences.refreshInterval * 1000)
		return () => clearInterval(interval)
	}, [])

	return (
		<List
			isLoading={isLoading}
			searchBarPlaceholder="Search network services to disable, enable, or toggle..."
			isShowingDetail={preferences.showNetworkDetails}
		>
			<List.Section title="Enabled Network Services">
				{networks
					.filter((n) => n.isEnabled)
					.map((network) => (
						<NetworkListItem key={network.name} network={network} changeState={bindChangeState(network)} />
					))}
			</List.Section>
			<List.Section title="Disabled Network Services">
				{networks
					.filter((n) => !n.isEnabled)
					.map((network) => (
						<NetworkListItem key={network.name} network={network} changeState={bindChangeState(network)} />
					))}
			</List.Section>
		</List>
	)
}
