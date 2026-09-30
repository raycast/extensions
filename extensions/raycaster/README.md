# Raycaster

The easiest way to send casts to [Farcaster](https://farcaster.xyz) from Raycast! Made possible through [Pinata's](https://pinata.cloud) Farcaster Hub and IPFS API for image uploads.

Requires a Farcaster account on [Warpcast's](https://warpcast.com) mobile app to authorize.

## Getting Started

After installing the Raycaster extension you will need to authorize it with the `Authorize Raycaster` command. This will bring up a QR code you can scan with your phone to approve in the Warpcast app. Once approved Raycaster will store the approved signer key and your account FID to local storage.

Once you are authorized you can start sending casts with the `Send Cast` command! You will find a place to put text for a cast, a place to paste a link, and a field for a channel if you want to cast in one. The channel field works by simply typing the name of the channel seen with the forward slash. For example, `/diet-coke` would just be `diet-coke`.

## Images

Image uploads are built in using Pinata. To add your key you can go to the `Send Cast` command and press `Command + Shift + p` which will open up the extension preferences. There you can put in your [Pinata API JWT](https://docs.pinata.cloud/account-management/api-keys) and your [Dedicated Gateway Domain](https://docs.pinata.cloud/gateways/dedicated-ipfs-gateways) (in the format of `llama-donkey-100.mypinata.cloud`).

## Contact

If you have any questions or requests please feel free to [contact me](mailto:hello@stevedylan.dev)!
