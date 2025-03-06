# Mux.com

Interact with your Mux account, directly from Raycast!

## Configuration

You'll need to generate an Access Token from the Mux.com dashboard. Currently,
they'll only need "Mux Video" permissions.

You'll also need to specify an `organizationId` and `environmentId`. These can
be retrieved from the Mux.com dashboard. Login, navigate to "Video / Assets",
then select your desired Organization and Environment from the dropdown at the
top. The values will then be in your URL, like so:

```
https://dashboard.mux.com/organizations/{organizationId}/environments/{environmentId}/video/assets
```
