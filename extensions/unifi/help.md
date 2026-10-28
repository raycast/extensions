# Set up UniFi

Create an API key in UniFi Site Manager or your local UniFi console, then enter it below.

For a local connection, enter an HTTPS console address, for example `https://192.168.1.1`. The extension validates the console certificate by default. If the console still uses UniFi's default self-signed certificate, enable **Allow a self-signed console certificate** in the extension preferences. Enable it only for a console you trust on a local network. Cloud requests always validate certificates.

For Cloud Connector access, also enter the console ID shown in Site Manager. After setup, run **Select Site** once before using Network commands.
