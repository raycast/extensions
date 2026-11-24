# LAN Scanner Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Scan the local network in the background (ping sweep + ARP), keep device history with first/last seen
- Port and service detection with nmap, MAC vendor lookup
- Firmware fingerprinting for ESPHome, PixelIt, Tasmota, WLED, Shelly, ESPEasy, AWTRIX and Tuya devices
- Filter by IP, name, vendor, MAC, firmware or port; custom device names
- Optional background scan every 30 minutes
