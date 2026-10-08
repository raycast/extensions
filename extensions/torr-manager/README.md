# Torrserver manager for raycast

The **torr-manager** extension allows users to connect to their TorrServer, browse available torrents, and select movies directly from Raycast, making torrent management seamless and efficient.

<img src="/metadata/torr-manager-1.png" alt="Torrserver Manager" width="550"/>

<img src="/metadata/torr-manager-2.png" alt="Torrserver Manager" width="550"/>

<img src="/metadata/torr-manager-3.png" alt="Torrserver Manager" width="550"/>

<img src="/metadata/torr-manager-4.png" alt="Torrserver Manager" width="550"/>

## Features

- **Connect to TorrServer**: Configure and manage your connection settings.
- **Browse Torrents**: View the list of torrents on your server.
- **Select Movies**: Play movies directly from the list with one click.
- **Add Torrents**: Upload new torrents from Raycast.
- **Remove Torrents**: Delete unwanted torrents easily.
- **Favorites**: Mark and access favorite torrents quickly.
- **Test Connection**: Test connection to your server from Raycast.
- **Search Torrents Across Trackers**: Add link to selfhosted [Jackett](https://github.com/Jackett/Jackett) parser to search for torrents across trackers and add them directly to your TorrServer from Raycast.

## Requirements

- **macOS**: This extension is designed to run on macOS.
- **Raycast**: Raycast must be installed on your system. You can download it from the [Raycast official website](https://www.raycast.com).
- **TorrServer**: You need to host your own instance of TorrServer or use a public one. The original TorrServer can be found here [https://github.com/YouROK/TorrServer](https://github.com/YouROK/TorrServer).
- **TorrServer**: To be able to use search - need to host own instance of [Jackett](https://github.com/Jackett/Jackett).

## Installation (Development Version)

To set up the development version of **torr-manager**, follow these steps:

1. Clone the repository:

   ```bash
   git clone https://github.com/dannius/torr-manager.git
   cd torr-manager
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the development version:
   ```bash
   npm run dev
   ```

## **Node.js Version**

This extension is written with **Node.js v20.16.0**. Ensure you have the correct version installed for optimal performance.
