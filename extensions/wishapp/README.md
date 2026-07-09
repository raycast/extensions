# WishApp for Raycast

Add products to your WishApp wishlists and browse them, straight from Raycast.

## Commands

- **Add to Wishlist** — paste a product URL, autofill title and price from the page, pick a wishlist, and save.
- **My Wishlists** — browse all your wishlists; open one in the browser or copy its share link.

## Setup

The extension authenticates with a WishApp API key:

1. Sign in at [getwish.app](https://www.getwish.app) (email, Google, or Apple — any method works) and open [Settings](https://www.getwish.app/settings).
2. Generate an API key and copy it.
3. Paste the key when Raycast prompts you the first time you run a command.

To replace the key later, generate a new one on the settings page and update it in the extension preferences.

## Affiliate links

Opening or copying a product link routes it through WishApp's link redirector (`go.getwish.app`), the same one the WishApp website uses. The redirector logs the click and adds affiliate codes for partner merchants (Amazon and Adtraction partners), falling back to [Skimlinks](https://skimlinks.com) for other stores, then forwards you to the product page. WishApp may earn a commission on purchases made through these links, at no extra cost to you.

## Privacy

- Your API key is stored by Raycast's preferences and sent only to WishApp's API. You can revoke it at any time from the [settings page](https://www.getwish.app/settings).
- Other than the affiliate redirects described above, the extension talks only to WishApp services (`getwish.app` and its image CDN).
