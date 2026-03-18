# Syncthing for Raycast

The Syncthing extension for Raycast provides an integrated way to view and manage your Syncthing local instance, folders, and devices from Raycast. 

## Setup 
In order to link the Syncthing extension to your local Syncthing instance, you will need your Syncthing API key. Depending on your setup, this can be done in multiple ways.

### Option 1: SyncTrayzor
If you are on a Windows machine and are using SyncTrayzor, then you can easily obtain the Syncthing API key from the SyncTrayzor GUI. 

In the top right, navigate to **Actions > Settings**. In the **General** tab, you will see an entry named **API Key**. If you haven't already done so, click **Generate**. Copy the API key from SyncTrayzor into the Syncthing Raycast extension. Now, the Syncthing Raycast extension will be able to fully interact with your local Syncthing instance through the REST API. 

### Option 2: Syncthing
If you are not running SyncTrayzor, it is still possible to get the API key fairly easily either through a GUI or through the Syncthing configuration file. Refer to the [official Syncthing API Documentation](https://docs.syncthing.net/dev/rest.html#api-key) for more guidance. Once you find the API key, paste it into the Syncthing Raycast extension. 

## Troubleshooting
1. Make sure that the local Syncthing REST API is enabled and working
2. Make sure that Syncthing is actually running
3. Update the Syncthing Raycast extension to the latest version
4. Update Raycast to the latest version