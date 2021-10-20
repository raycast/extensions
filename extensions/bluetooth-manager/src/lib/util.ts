import { string } from 'fp-ts';
import { BluetoothDevice, ScriptBoolean, ScriptResult } from './types';

export const parseScriptBoolean = ( bool: ScriptBoolean ): boolean =>
	bool === 'attrib_Yes'

export const mapBluetoothDevice = (rawDevice: ScriptResult['SPBluetoothDataType'][0]['device_title'][0]): BluetoothDevice => {
	const name = Object.keys(rawDevice)[0];
	const device = rawDevice[name];

	return {
		addr: device.device_addr,
		id: device.device_productID,
		name,
		connected: parseScriptBoolean( device.device_isconnected ),
		paired: parseScriptBoolean( device.device_ispaired ),
		type: device.device_minorClassOfDevice_string
	}
}
