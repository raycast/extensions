# V2BOX VPN

Control your V2BOX VPN connection from Raycast.

## Requirements

- macOS
- V2BOX installed
- A configured VPN profile available through `scutil --nc`

## Setup

1. Run `scutil --nc list` in Terminal.
2. Copy the exact VPN service name.
3. Open Raycast Preferences -> Extensions -> V2BOX VPN.
4. Set `VPN Service Name`.

## Commands

- `On`
- `Off`
- `Status`
- `Toggle`

## Local Installation

1. Open the extension folder in your code editor.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open Raycast and search for `V2BOX VPN`, `On`, `Off`, `Status`, or `Toggle`.

After the first `npm run dev`, the extension stays imported in Raycast. When you want to continue development later, run `npm run dev` again.
