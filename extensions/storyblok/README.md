# Storyblok

Use this extension to query your Storyblok spaces, stories, assets and more.

## Getting started:

### Getting your Personal Access Token:
In order to use this extension, you will need to obtain a Personal Access Token. This Token is the secure connection between Raycast and the Storyblok Management API. Keep this token safe and secret!.

To obtain your own Personal Access Token, follow these steps:
1. Visit [https://storyblok.com](https://storyblok.com) and login to the service.
2. From your dashboard, select "My Account" in the main sidebar, [then select "Account Settings"](https://app.storyblok.com/#/me/account?tab=token.)
3. Under "Security", select "Personal Access Token", and select "Create new token"
4. Give this token a descriptive name like "Rob's Storyblok Raycast token".
5. For an expiration date, I would advise creating a long-term token by selecting a date pretty far out, so you don't need to reset it often. Make sure that this token is safe and secure and only use it within Raycast. 
6. Select "Generate & Copy token".
7. Paste this token into your Raycast settings.

### Setting up your region:
Storyblok divides their service depending on region. If you operate in more than one region, like in China and Europe, only one token can be associated with each region. Meaning you will only be able to access spaces in the region associated with your region.

Make sure that you select the correct region when setting up your account.

###  Your preferred Modifier keys:
While this extension only has one command, it is still pretty powerful. 

To access the below, you can hit "cmd + k" and then arrow key to what you want, OR, you can use a modifier key + letter to access them. Shortcuts can be opinionated within Raycast, so setting up a custom Modifier Key allows you to use what works with you without conflicting other commands or shortcuts. I personally use `ctrl` because I use option and shift elsewhere.

Inside in each space, you can get access to the following:
1. That space's **details** `cmd + enter`  (api details, usage, settings, etc)
2. That space's **stories** `modifier + S` (entry details, published status, last changes, the API responses)
3. That space's **assets** `modifier + A` (view the assets, copy their URLs, etc)
4. That space's **collaborators** `modifier + C` (their roles/permissions)
5. That space's **activity** `modifier + V` (who did what last)

## Support
This is an unofficial extension provided by an architect (Rob Erskine) who works at [Stellar Elements, an Amdocs Company](https://stellarelements.com), that is in Storyblok's partner program. If you run into any issues, feel free to message me in their official Discord, [my Github](https://github.com/RobErskine), or on [Twitter/X](https://x.com/erskinerob).