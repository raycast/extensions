import { Icon, List, ListItem, showToast, ToastStyle } from '@raycast/api'
import { useEffect, useState } from 'react'

import { pipe } from 'fp-ts/lib/function'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { match } from 'ts-pattern'
import { BluetoothDevice } from './lib/types'
import { getBluetoothDevices } from './lib/scripts'
import * as A from 'fp-ts/Array'


const DeviceListItem = ( { device }: { device: BluetoothDevice } ) => (
	<ListItem
		key={device.id}
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
			const data = await getBluetoothDevices()

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
