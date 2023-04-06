on connectDevice(device)
	if not (device's isConnected as boolean) then
		set result to device's openConnection()
		return result
	else
		return -1
	end if
end connectDevice