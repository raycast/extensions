import util from "util"
import child_process from "child_process"
import os from "os"
import { showToast, Toast } from "@raycast/api"

import { ChangeState, Network } from "./types"
import { getPreferences } from "./preferences"

const exec = util.promisify(child_process.exec)

export const listNetworks = async (): Promise<Network[]> => {
	if (os.platform() !== "darwin") throw new Error("Unsupported environment")

	try {
		const { stdout } = await exec("/usr/sbin/networksetup -listallnetworkservices")
		return await getNetworks(stdout)
	} catch (error) {
		if (!(error instanceof Error)) throw error

		console.error(error)

		showToast(Toast.Style.Failure, "Error listing networks", error.message)

		return []
	}
}

const getNetworkDetail = async (name: string): Promise<string> => {
	const preferences = getPreferences()
	if (!preferences.showNetworkDetails) return ""

	const { stdout } = await exec(`/usr/sbin/networksetup -getinfo "${name}"`)
	return stdout.replace(/\n/g, "\n\n")
}

const waitBetweenToggle = async (network: Network) => {
	const preferences = getPreferences()

	let skipWaiting = (): void => {
		throw new Error("not assigned")
	}

	const loading = new Toast({
		style: Toast.Style.Animated,
		title: `Waiting for ${preferences.toggleDelay.toFixed(2)}s between toggling “${network.name}”...`,
		primaryAction: {
			title: "Skip Waiting",
			onAction: () => skipWaiting(),
		},
	})

	await loading.show()
	await new Promise<void>((resolve) => {
		const timeout = setTimeout(resolve, preferences.toggleDelay * 1000)
		skipWaiting = () => {
			clearTimeout(timeout)
			resolve()
		}
	})
	await loading.hide()
}

const getNetworks = async (raw: string): Promise<Network[]> => {
	const preferences = getPreferences()

	const networkStrings = raw.split("\n").filter((name, index) => name.length > 0 && index > 0)

	const allNetworks: Network[] = await Promise.all(
		networkStrings.map(async (rawName) => {
			const name = rawName.replace(/^\*/, "")
			const detail = await getNetworkDetail(name)

			return {
				detail,
				isConnected: /IP address: \d+.\d+.\d+.\d+/.test(detail),
				isEnabled: !rawName.startsWith("*"),
				name,
			}
		})
	)

	const visibleNetworks = allNetworks.filter(({ name }) => !preferences.ignoredNetworks.has(name))

	return visibleNetworks
}

const disableNetwork = async (network: Network) => {
	const loading = new Toast({
		style: Toast.Style.Animated,
		title: `Disabling “${network.name}”...`,
	})

	await loading.show()
	await exec(`/usr/sbin/networksetup -setnetworkserviceenabled "${network.name}" off`)
	await loading.hide()
}

const enableNetwork = async (network: Network) => {
	const loading = new Toast({
		style: Toast.Style.Animated,
		title: `Enabling “${network.name}”...`,
	})

	await loading.show()
	await exec(`/usr/sbin/networksetup -setnetworkserviceenabled "${network.name}" on`)
	await loading.hide()
}

export const changeNetworkState = async ({
	mode,
	network,
	onChanged,
}: {
	mode: ChangeState
	network: Network
	onChanged(): Promise<void>
}) => {
	switch (mode) {
		case ChangeState.DISABLE: {
			await disableNetwork(network)
			showToast(Toast.Style.Success, `Successfully disabled “${network.name}”`)
			break
		}

		case ChangeState.ENABLE: {
			await enableNetwork(network)
			showToast(Toast.Style.Success, `Successfully enabled “${network.name}”`)
			break
		}

		case ChangeState.TOGGLE: {
			if (network.isEnabled) {
				await disableNetwork(network)
				await onChanged()
				await waitBetweenToggle(network)
				await enableNetwork(network)
			} else {
				await enableNetwork(network)
				await onChanged()
				await waitBetweenToggle(network)
				await disableNetwork(network)
			}
			showToast(Toast.Style.Success, `Successfully Toggled “${network.name}”`)
			break
		}
	}

	await onChanged()
}
