import { getPreferenceValues } from "@raycast/api"
import { Preferences } from "./types"

export const getPreferences = (): Preferences => {
	const prefs = getPreferenceValues<{
		ignoredNetworks: string
		refreshInterval: string
		showNetworkDetails: boolean
		toggleDelay: string
		useSudo: boolean
	}>()

	return {
		ignoredNetworks: new Set(prefs.ignoredNetworks.split(",")),
		refreshInterval: parseFloat(prefs.refreshInterval),
		showNetworkDetails: prefs.showNetworkDetails,
		toggleDelay: parseFloat(prefs.toggleDelay),
		useSudo: prefs.useSudo,
	}
}
