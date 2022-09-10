export type Network = {
	detail: string
	isConnected: boolean
	isEnabled: boolean
	name: string
}

export type Preferences = {
	ignoredNetworks: Set<string>
	refreshInterval: number
	showNetworkDetails: boolean
	toggleDelay: number
}

export enum ChangeState {
	DISABLE = "DISABLE",
	ENABLE = "ENABLE",
	TOGGLE = "TOGGLE",
}
