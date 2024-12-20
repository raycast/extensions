# Pritunl

Extention help quickly connect already configured Pritunl VPN tunnel.

For the sake of simplicity, there is no UI for selection for different connections, just find ID and put it to the settings as per screenshot.


1. Select Pritunl appliction from dropdown menu.
2. Find your connection id using command 
``` shell
/Applications/Pritunl.app/Contents/Resources/pritunl-client list -j | jq
```
and put it to the Pritunl Connection ID field.  
3. Set your PIN for conenction.

(assets/preferences.png)
