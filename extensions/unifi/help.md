# Set up UniFi

Create an API key in UniFi Site Manager or your local UniFi console, then enter it below.

For a local connection, enter an HTTPS console address, for example `https://192.168.1.1`. The extension always validates the console certificate before sending the API key. Use a hostname and certificate trusted by the Raycast runtime. If the console still uses its default self-signed certificate, configure a trusted certificate on the console or use Cloud Connector mode.

For Cloud Connector access, also enter the console ID shown in Site Manager. After setup, run **Select Site** once before using Network commands.
