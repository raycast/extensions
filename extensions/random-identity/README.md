# Random Identity

Generate a new random identity

## Duckduckgo email generator and email converter

Use your own duckduckgo email and token. Get your token using this instruction below:
- Install Duckduckgo extension for [Google Chrome](https://chrome.google.com/webstore/detail/duckduckgo-privacy-essent/bkdgflcldnnnapblkhphbgpggdiikppg), [Microsoft Edge Chromium](https://microsoftedge.microsoft.com/addons/detail/duckduckgo-privacy-essent/caoacbimdbbljakfhgikoodekdnlcgpk?city=Lynchburg) or other browsers that supported that extension.
- Install a HTTP debug tool like Proxyman, Charles Proxy. Turn on SSL Proxying on `quack.duckduckgo.com`. Make sure to install and trust Root CA from HTTP debug tool to perform the man-in-the-middle (MITM) attack.
- Access `https://duckduckgo.com/email/` to sign in your @duck.com email or sign up for a new account.
- Switch to the network debug tool, look for a request to `https://quack.duckduckgo.com/api/email/dashboard`. Its response body contains the account token under value of `access_token` key. Don't forget to add `Bearer ` prefix with `access_token` to avoid unauthorized errors.

![](https://i.imgur.com/VN3ZpVu.jpeg)

- If you already installed Duckduckgo extension and signed in into your @duck.com email, let's create a new email and catch this request: `https://quack.duckduckgo.com/api/email/addresses`. Copy Authorization token from request headers

![](https://i.imgur.com/IPOKBiA.jpeg)


## Random username, name, adress generator

Get your API Token here: https://rapidapi.com/mrsonj/api/random-username-generate

## Random password generator

Choose your favourite default length of password or customize it when you call the extension.

# Disclaimer
- Duckduckgo token is not a cookie. I found it is unchanged between login sessions. Please keep it in a safe place. I won't take any responsibility for any trouble.

