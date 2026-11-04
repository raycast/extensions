# Sonos Local

Control the Sonos speakers on your local network straight from Raycast. The extension talks to the speakers over UPnP on port 1400, so it needs no Sonos account, no cloud connection and no login.

## Commands

- **Control Sonos**: every room and group with the current track. Play, pause, skip, change the volume, mute, group speakers and set per-room volume.
- **Group Speakers**: add speakers to the active group or take them out.
- **Rename Room**: give a room a new name.
- **Play or Pause**, **Raise Volume**, **Lower Volume**: quick commands for the active group, handy as hotkeys.

## Setup

Speakers are found automatically via SSDP. If discovery doesn't work on your network, enter the IP address of any speaker in the extension preferences.

The quick commands act on the group that is playing. When nothing is playing they use the **Default Room** from the preferences.

Your Mac must be on the same network as the speakers.
