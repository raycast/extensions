# Telegram Raycast

This app lets you quickly send a message to one of your contacts without the chaos of a full client.

## Authentication

1. The app will ask you for your phone number on first launch.

2. Please head to the Login command and request a code. When the operation is successful, you will see the code and password fields rendered. _If_ your account is protected by a password, please input it. When you are ready, send the credentials. The authorisation takes place via a proxy, code available [here](https://github.com/noxlovette/telegram-proxy).

3. After you have been redirected to the Send Message interface, you can safely turn off the Login command in your preferences.

4. The extension works now. You can search through your contacts via their phone number, name, id, or their username.

## Relogging

If you wish to log in under a different username, run the reset action in the Send Message command, then delete/redefine your phone number in extension settings.

## Troubleshooting

If something goes wrong contact me via https://t.me/noxlovette.

---

## P.S.

The authentication might feel a bit tedious. I did my best to make it as quick and enjoyable as possible. At any rate, you only do it once.

The reason why I went for a proxy is the need to use my unique api_id and api_hash, two secret values that I cannot store in Raycast under any circumstances. The proxy is very simple, it basically just resends your requests to Telegram, enriching them with the client credentials. At the end of the day, the unique session string is stored safely in Raycast encrypted local storage and has all the data needed for seamless interaction with the messenger.
