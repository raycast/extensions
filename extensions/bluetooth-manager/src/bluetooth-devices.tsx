import { ActionPanel, Color, CopyToClipboardAction, environment, Icon, List, ListItem, showToast, ToastStyle } from '@raycast/api'
import { useEffect, useState } from 'react'

import { pipe } from 'fp-ts/lib/function'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { match } from 'ts-pattern'
import { BluetoothDevice } from './lib/types'
import * as Bluetooth from './lib/bluetooth'
import * as A from 'fp-ts/Array'


const DeviceListItem = ( { device }: { device: BluetoothDevice } ) => (
	<ListItem
		key={device.id}
		keywords={[device.name, device.id, device.addr, device.type ?? 'unknown']}
		title={device.name}
		icon={{
			source: device.connected ? Icon.Checkmark : Icon.Dot,
			tintColor: device.connected ? 'lime' : 'gray'
		}}
		accessoryTitle={device.addr}
		accessoryIcon={{
			tintColor: 'white', // just for coherence with `Icon.QuestionMark` since other icons are white.
			source: match( device.type )
				.with( 'Headphones', () => '../assets/headphones-icon.png' )
				.with( 'Keyboard', () => '../assets/keyboard-icon.png' )
				.otherwise( () => Icon.QuestionMark )
		}}
		actions={
			<ActionPanel title={device.name}>
				<CopyToClipboardAction
					content={device.addr}
					title='Copy Address'
				/>

				<ActionPanel.Item
					id='connection-item'
					title={device.connected ? 'Disconnect' : 'Connect'}
					onAction={() => device.connected
						? Bluetooth.disconnectDevice( device.addr )
						: Bluetooth.connectDevice( device.addr )
					}
					icon={{
						source: device.connected ? Icon.Link : Icon.Link,
						tintColor: device.connected ? Color.Orange : Color.Blue
					}}
				/>

				{environment.isDevelopment && (
					<ActionPanel.Item
						title='Log'
						icon={Icon.Terminal}
						onAction={() => console.log( device )}
						shortcut={{
							key: '.',
							modifiers: ['cmd']
						}}
					/>
				)}

				<ActionPanel.Item
					title='Forget Device'
					onAction={() => Bluetooth.unpair( device.addr )}
					id='forget-element'
					icon={{
						source: Icon.Trash,
						tintColor: Color.Red
					}}
					shortcut={{
						key: 'backspace',
						modifiers: ['cmd']
					}}
				/>
			</ActionPanel>
		}
	/>
)


export default function BluetoothDevices() {
	const [isLoading, setIsLoading] = useState( true )
	const [devices, setDevices] = useState<{ paired: BluetoothDevice[]; others: BluetoothDevice[] }>( {
		others: [],
		paired: []
	} )

	useEffect( () => {
		const init = async () => {
			const data = await Bluetooth.getPairedDevices()

			setIsLoading( false )

			if ( E.isLeft( data ) ) {
				console.error( data )
				showToast( ToastStyle.Failure, data.left.message )
				return
			}

			if ( O.isNone( data.right ) ) {
				showToast( ToastStyle.Failure, 'No devices found' )
				return
			}

			const allDevices = data.right.value

			setDevices(
				s => pipe(
					allDevices,
					A.reduce( s, ( acc, device ) => ( {
						...acc,
						[device.paired ? 'paired' : 'others']: [
							...acc[device.paired ? 'paired' : 'others'],
							device
						]
					} ) )
				)
			)
		}


		init()
	}, [] )

	return (
		<List isLoading={isLoading} navigationTitle='Bluetooth Devices'>
			<List.Section title='My Devices'>
				{devices.paired.map( device => (
					<DeviceListItem key={device.id} device={device} />
				) )}
			</List.Section>
			<List.Section title='Devices'>
				{devices.others.map( device => (
					<DeviceListItem key={device.id} device={device} />
				) )}
			</List.Section>
		</List>
	)
}
