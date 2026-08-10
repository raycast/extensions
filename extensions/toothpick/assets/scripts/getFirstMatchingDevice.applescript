on getFirstMatchingDevice(deviceMacAddress)
	repeat with device in (current application's IOBluetoothDevice's pairedDevices() as list)
		if (device's addressString as string) contains deviceMacAddress then return device
	end repeat
end getFirstMatchingDevice