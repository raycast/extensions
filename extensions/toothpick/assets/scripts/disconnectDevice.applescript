on disconnectDevice(device)
	if (device's isConnected as boolean) then
		if device's closeConnection() = 0 then
			delay 0.1
			return 0
		else
			return -1
		end if
	else
		return -1
	end if
end disconnectDevice
