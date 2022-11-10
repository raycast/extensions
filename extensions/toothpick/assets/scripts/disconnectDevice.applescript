on disconnectDevice(device)
	if (device's isConnected as boolean) then
		set result to device's closeConnection()
		return result
	else
		return -1
	end if
end disconnectDevice