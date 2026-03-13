# HubSpot Portal Launcher

A simple Raycast extension that allows you to quickly launch and navigate to different objects in your HubSpot portals. This extension is perfect for people who are working on and/or maintaining multiple portals like HubSpot Partner employees and developers. If you're using only one portal, I recommend using the [HubSpot Raycast Extension](https://www.raycast.com/harisvsulaiman/hubspot) by [Haris Sulaiman](https://github.com/harisvsulaiman).

## Import Your Existing Portals from JSON

Instead of adding all your portals' information one by one, you're also able to import all your portals' information with the `Import Portals` Command from a JSON file.

Please note that the command doesn't validate the information you're importing. So make sure that the JSON file is formatted correctly.

The JSON file needs to be formatted like this:

```json
[
  {
    "portalId": "12345678",
    "portalName": "Acme Corp",
    "portalType": "Production"
  },
  {
    "portalId": "98765432",
    "portalName": "Acme Corp",
    "portalType": "Dev"
  },
  {
    "portalId": "78945612",
    "portalName": "Acme Corp",
    "portalType": "Test"
  }
]
```

For the `portalType` you can use the following values:

- `Production`
- `Dev`
- `Test`
- `CMS Sandbox`
- `Sandbox`
