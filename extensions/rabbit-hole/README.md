# Rabbit Hole

Discover and manage information your Rabbit r1 has saved in your rabbit hole journal.

## Known Issues
There is no official Rabbit r1 / Rabbit Hole API. This extension relies on reverse engineering the Rabbit Hole web application. This application uses an `accessKey` that can be obtained from logging in to https://hole.rabbit.tech/. Unfortunately this token expires after 24 hours, so you will need to follow the steps below to continue this extension on consecutive days. For that reason, this extension is mostly experimental. Personally, this makes my Rabbit r1 more useful, but your mileage may vary.

## Getting your access key
Rabbit utilizes an authentication platform called Auth0, with a CAPTCHA in front of it provided by Cloudflare, which makes logging into your account much more secure. However, this means that interacting with your data over their API isn't as streamlined as other apps.

To get around this, we can log into the rabbithole and follow these steps:

1. Log into the rabbit hole: [https://hole.rabbit.tech/](https://hole.rabbit.tech/)
2. Press F12 to bring up the developer console. If this doesn't work, right-click the page, and click inspect.
3. Expand the developer console for better viewing
4. Click the Network tab in the top navigation bar.
5. Press Ctrl + R to reload the page.
6. Near the bottom of the middle pane, find and select "fetchUserJournal".
7. In the new pane that opened, select Payload in the top navigation bar.
8. Select everything inside the quotes after accessToken. This is your user token. _Note: Your token will expire 24 hours after you log in. This is out of our control but I'm actively looking on a way around this_.

## Why is my name a required field?
Your access key normally expires in 24 hours. However, somtimes (still experimenting with this) whenever your account name is updated, this token gets refreshed. This extension uses a `no-view` command in the background to refresh your account name in the rabbit hole every 4 hours to ensure that you don't get logged out.

## Help! I am no longer able to access my journal data
It is most likely that your access key has expired. If you stepped away from your machine for an extended amount of time, or quit Raycast from running, it is possible your access key wasn't able to be renewed. Follow the steps in the "Getting your access key" to add it back in again.

## Disclaimer

This extension is a third-party contribution and is not officially affiliated with or endorsed by Raycast. The developers of this extension are solely responsible for its functionality and maintenance. Users of this extension do so at their own risk, and Raycast bears no responsibility for its use or any consequences thereof. By installing and using this extension, you acknowledge that you are responsible for your use of this extension and any actions taken through it.