# Strapi Raycast Extension

Strapi extension for Raycast. Explore your Strapi content & media all from within Raycast.

## Compatibility
This extension currently only supports Strapi v5 instances.

## Required settings
|Setting|Description|
|-------|-----------|
|Strapi Host|URL of your strapi instance (e.g. `http://localhost:1337`, `https://api.domain.ext`)|
|Strapi API Token|Generate an API Token via 'Strapi -> Settings -> API Tokens' (with full access)|

## Caveats
Due to the limitations of Strapi's REST API, it's not always possible to properly index content-types. For instance, you might encounter different fields being used as your entry title then that you have configured in Strapi. This is because Strapi doesn't include information about entry titles in their API.

## Roadmap
- [ ] Entry creation
- [ ] File uploads
- [ ] Connect with multiple Strapi instances

## Contribution
Feel free to contribute to the project by making a pull request!

## Disclaimer
I am in no way affiliated with Strapi. I enjoy using Strapi and I enjoy using Raycast, therefore I created this extension. This is my contribution to Strapi's open source ecosystem.
