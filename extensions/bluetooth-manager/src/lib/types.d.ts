export type LiteralUnion<T extends U, U = string> = T | ( U & Record<never, never> );
export type ScriptBoolean = `attrib_${'Yes' | 'No'}`
export type DeviceType = LiteralUnion<'Keyboard' | 'Headphones'>;

export type BluetoothDevice = {
	addr: string;
	id: string;
	name: string;
	connected?: boolean
	paired?: boolean
	type?: DeviceType
}


export type ScriptResult = {
	SPBluetoothDataType: {
		apple_bluetooth_version: string;
		device_title: {
			// This is not a complete list.
			// Properties may change based on device class/type.
			[name: string]: {
				device_addr: string;
				device_address_resolvable: string;
				device_address_type: string;
				device_AFHEnabled: string;
				device_AFHMap: string;
				device_classOfDevice: string;
				device_ConnectionMode: string;
				device_core_spec: string;
				device_fw_version: string;
				device_interval: string;
				device_isconfigured: ScriptBoolean;
				device_isconnected: ScriptBoolean;
				device_ispaired: ScriptBoolean;
				device_manufacturer: string;
				device_minorClassOfDevice_string?: DeviceType
				device_productID: string;
				device_role: string;
				device_RSSI: number;
				device_services: string;
				device_vendorID: string;
			}
		}[]
	}[]
}


export type BlueUtilDevice = {
	address: string;
	recentAccessDate: string;
	paired: boolean;
	RSSI: number;
	rawRSSI: number;
	favourite: boolean;
	connected: boolean;
	name: string;
	slave: boolean
}
