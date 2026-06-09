# WishApp for Raycast

Add products to your WishApp wishlists and browse them, straight from Raycast.

## Commands

- **Add to Wishlist** — paste a product URL, autofill title and price from the page, pick a wishlist, and save.
- **My Wishlists** — browse all your wishlists; open one in the browser or copy its share link.

## Sign in

The first time you run a command, you'll be asked for your WishApp email and password. WishApp requires a verified email — if you registered with Google/Apple or haven't verified yet, do so at [getwish.app](https://www.getwish.app) first and set a password via "Forgot Password" if needed.

Your session token is stored locally with Raycast's `LocalStorage` and sent as a bearer token on every API call. If the token expires, you'll be asked to sign in again.

## Privacy

- The extension talks only to WishApp services (`getwish.app` and its image CDN).
- No third-party analytics.
- Your password is sent once to the WishApp sign-in endpoint and never stored.
