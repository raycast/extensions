## NordVPN executable path

Install and sign in to the NordVPN app for Windows before using this extension. The extension controls that app; it does not install NordVPN or handle account credentials.

The default CLI path is:

```text
C:\Program Files\NordVPN\NordVPN.exe
```

If NordVPN is installed in a different location, enter the full path to `NordVPN.exe` in the required preference. The extension launches the executable directly with arguments and does not invoke a shell.

Connection state is verified using the Windows `NordLynx` network adapter and the public IP/country returned by `ipwho.is`. This IP lookup service receives your public IP.
