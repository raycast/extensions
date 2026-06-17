<div align="center">
  <img src="media/diskutil.png" width="100" alt="Logo">
  <h1>Disk Utility</h1>

Raycast extension to create, list and delete Apple File System (APFS) disk volumes

  <p>
    <a href="https://www.raycast.com/stelo/disk-util">
      <img src="https://img.shields.io/badge/Raycast-store-red.svg"
        alt="Find this extension on the Raycast store"
      />
    </a>
    <a
      href="https://github.com/raycast/extensions/blob/master/LICENSE"
    >
      <img
        src="https://img.shields.io/badge/license-MIT-blue.svg"
        alt="raycast-extensions is released under the MIT license."
      />
    </a>
    <img
      src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
      alt="PRs welcome!"
    />
  </p>
</div>

## Features
### Create Volume

This command makes it easy to create an encrypted APFS volume. In case of encrypted volumes, it generates a secure passphrase, creates the volume, 
and stores the passphrase in the system keychain so that the volume can be automatically decrypted and mounted on boot. 
Volume password is not stored in the user's keychain because that keychain may get deleted by password rotation.

### Showing the volumes

You can list all the mounted volumes with available capacities and show details, show in finder, create quicklink, delete the volume, etc.

## Showcase

<img src="media/extension-usage.gif" alt="Extension Usage">

