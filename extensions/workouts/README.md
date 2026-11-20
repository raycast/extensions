# Workouts

Your workouts from Strava, now at your fingertips in Raycast.

- Search your recent workouts and view activity details and splits
- See workout totals in the menu bar
- Compare your activities with other members of your club
- Browse your routes and download them as GPX or TCX files
- Create manual activities on Strava
- Calculate workout time or pace

## Set Up Your Strava App

Workouts requires your own Strava API app. Creating a personal API app requires a **paid Strava subscription**. New apps initially support only the owner's Strava account.

### Setup Instructions

1. Open [Strava API Settings](https://www.strava.com/settings/api) and create an app, or open your existing app.
2. Set **Authorization Callback Domain** to `raycast.com` — without `https://` or a path — and save.
3. Copy the **Client ID** and **Client Secret** from your app's settings.
4. Open a Workouts command. Enter both values when Raycast prompts you, or choose **Configure Strava** (⌘,) on the setup screen and paste them into **Strava Client ID** and **Strava Client Secret** in Workouts settings.
5. Reopen the command and choose **Sign in with Strava**, then authorize access in your browser.

Both credential fields are required for new and existing users. These settings apply to every command in the extension, including the calculator. The Client Secret field is masked.

The setup screen also includes a **Copy Callback Domain** action. Need help creating your app? See [Strava's setup guide](https://developers.strava.com/docs/getting-started/).

## Sign In and Reconnect

Your Client ID and Client Secret identify your API app. You still sign in with your Strava account through OAuth to grant that app access to your workouts, routes, clubs, and manual activity creation.

Workouts refreshes your connection automatically. You do not need to copy access or refresh tokens. The client secret is sent directly to Strava's token endpoint, and Raycast stores the resulting tokens separately for each Client ID.

After changing your credentials, reopen the command. Once sign-in completes, Workouts settings show **Logged into Strava** and a **Logout** button. To reconnect, choose **Logout**, then reopen a command and sign in again.

## Troubleshooting

- **Missing credentials:** Enter both values in Workouts settings. If you clear a credential, the command shows setup instructions instead of attempting sign-in.
- **Sign-in fails:** Check your Client ID, Client Secret, and callback domain. Make sure you are signing into the Strava account that owns your personal app, then try again.
- **Strava denies API access:** Check your app's status and granted permissions in [Strava API Settings](https://www.strava.com/settings/api), then reconnect. App restrictions, rate limits, and feature access still apply.
- **Sign-in times out or Strava is unavailable:** Try again when your connection and Strava are available.

For more details, see [Strava's authentication documentation](https://developers.strava.com/docs/authentication/).

<hr />

Powered by Strava

![Powered by Strava](./powered-by-strava.png)
