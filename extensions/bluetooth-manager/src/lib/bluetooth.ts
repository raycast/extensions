import { runAppleScript } from 'run-applescript'
import { pipe } from 'fp-ts/function'
import type { ScriptResult } from './types'

import * as R from 'fp-ts/Reader'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import * as A from 'fp-ts/Array'
import * as J from 'fp-ts/Json'
import * as O from 'fp-ts/Option'

import { mapBluetoothDevice } from './util'


export const getPairedDevices = pipe(
	TE.tryCatch(
		() => runAppleScript( 'do shell script "/usr/sbin/system_profiler -json SPBluetoothDataType"' ),
		E.toError
	),
	TE.chainEitherK( data => pipe(
		data,
		J.parse,
		E.mapLeft( () => new Error( 'Could not parse JSON' ) ),
		E.map( json => pipe(
			( json as ScriptResult ).SPBluetoothDataType,
			A.head,
			O.map(d =>
					pipe(
						d.device_title,
						A.map(mapBluetoothDevice)
					)
				)
		) ),
	) )
)

export const blueutil = pipe(
	R.ask<string>(),
	R.map( args =>
		pipe(
			TE.tryCatch(
				() => runAppleScript( `do shell script "/usr/local/bin/blueutil ${args} --format json"` ),
				E.toError
			),
			TE.map(console.log)
		)
	)
)


export const disconnectDevice = (deviceAddress: string) =>
	blueutil(`--disconnect ${deviceAddress}`)()

export const connectDevice = (deviceAddress: string) =>
	blueutil(`--disconnect ${deviceAddress}`)()

export const unpair = (deviceAddress: string) =>
	blueutil(`--unpair ${deviceAddress}`)()
