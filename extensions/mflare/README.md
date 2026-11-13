# MFlare

Check your Cloudflare Usage against its Quota, your Workers with their latest Deployments and Builds, and Build Logs, from Raycast. The extension reads all of this from the [MFlare](https://mflare.yuy1n.io) app on your Mac, which keeps it up to date in the menu bar. The app isn't included here.

## Requirements

- **MFlare Pro.** MFlare is free to download, but the Raycast extension only works with **MFlare Pro**, a separate one-time purchase. On MFlare Free, every command shows "Raycast needs MFlare Pro". See [mflare.yuy1n.io](https://mflare.yuy1n.io/#pricing) for pricing.
- MFlare running on the same Mac, signed in to at least one Cloudflare Account.
- macOS 14 or later.

## Setup

1. In MFlare, open **Settings › Integrations** and turn on **Raycast**.
2. Click **Copy Connection**. The connection looks like `mflare://127.0.0.1:47823?token=…`.
3. Run any MFlare command in Raycast and press <kbd>↵</kbd> to paste the connection. When it's on the clipboard, it's filled in for you.

The connection only reaches MFlare on this Mac (`127.0.0.1`), and its token is used for nothing else. The extension keeps it in Raycast's encrypted local storage. If you change MFlare's port or regenerate the Raycast token, copy the connection again and use **Change Connection…** from any command's actions (<kbd>⌘</kbd> <kbd>K</kbd>); **Clear Connection** forgets it.

## Commands

- **Cloudflare Usage** shows the Usage of each Cloudflare service (Workers, Durable Objects, KV, R2 and D1) against its Quota, with the estimated overage on the Workers Paid plan.
- **Cloudflare Workers** lists your Workers with their latest Deployment or Build. Open a Worker to see its history, and open a Build to read its Build Log, which updates while the Build runs.

With more than one Cloudflare Account in MFlare, pick the Account from the dropdown next to the search bar.

## Troubleshooting

- **Can't reach MFlare**: make sure MFlare is running and Raycast is on in its Settings › Integrations.
- **MFlare didn't accept the connection**: the token was regenerated. Copy the connection again and paste it.
- **Raycast needs MFlare Pro**: activate a license in MFlare's Settings › License.
