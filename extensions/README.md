# Hubspot®

### Disclaimer

> Disclaimer: This is not an official HubSpot product. It is a raycast plugin created by a third party and may not accurately reflect the features and capabilities of HubSpot products. Please refer to the official HubSpot website for accurate and up-to-date product information.

### To configure your Hubspot accessToken, follow these steps:

- Go to the Hubspot website and log in to your account.
- Click on the settings icon.
- In the left sidebar, click on "Integrations" and then on "Private apps".
- Under "Private apps" , click on create Private App
- Enter a name for the Private App .
- Add the following scopes to the private app.
  - `tickets`
  - `e-commerce`
  - `crm.lists.read`
  - `crm.objects.contacts.read`
  - `crm.objects.custom.read`
  - `crm.objects.custom.write`
  - `media_bridge.read`
  - `crm.objects.deals.read `

Copy the AccessTokeny that is generated. This is your Hubspot accessToken.

In your extension's preferences, paste the accessToken under "Hubspot AccessToken".

Now you can use the accessToken to access the Hubspot API and integrate it with your extension.

### Refer Hubspot® for Acceptable Usage Policy

https://legal.hubspot.com/acceptable-use
