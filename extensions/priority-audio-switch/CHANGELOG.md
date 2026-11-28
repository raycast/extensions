# Priority Audio Switch Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Fork of [Set Audio Device](https://www.raycast.com/benvp/audio-device) by benvp and contributors, rebuilt around automatic switching by priority
- Separate priority lists for input and output devices, up to five devices each
- Switch on Connect: a device without a rank takes over when it connects (on by default for Bluetooth outputs and the headphone jack)
- Enable Auto Switch: switches to the best connected device when a device connects or disconnects, keeps a manual choice until the next change, and switches away from hidden devices
- Cycle Output Device and Cycle Input Device: step through the devices that have a priority
- Customize Device: custom name and icon
- Device icons chosen from the device type (Mac model, headphone jack, USB, Bluetooth, AirPlay, displays), using Tabler Icons
- Devices with a priority stay in the list when they are not connected
- Pin Volume and Mute Device as actions in the device list
- The device list updates at once when you change something, and refreshes devices and volumes while it is open
