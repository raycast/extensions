# Ring Intercom Extension for Raycast

Unlock your door with your Ring Intercom from Raycast, without opening the Ring app. Works with Ring Intercom and Ring Intercom Video, on macOS and Windows.

## Commands

- **Unlock Door**: unlocks your default intercom. If you haven't chosen a default and your account has only one intercom, that one is used.
- **Select Default Intercom**: lists your intercoms with their battery level and connection. Choose the one Unlock Door opens, or unlock any of them from the list.
- **Authenticate**: signs in to your Ring account.

## Setup

1. Install the extension
2. Run the "Authenticate" command
3. Enter your Ring account email, password, and 2FA code
4. If you have more than one intercom, run "Select Default Intercom" and choose one
5. Use the "Unlock Door" command

## How it Works

### Authenticate

- Signs in to Ring with your email, password and 2FA code
- Stores the sign-in token Ring returns in Raycast's local storage. Your password is used only to sign in and isn't stored

### Unlock Door

- Uses the stored token to authenticate with Ring's API
- Finds your default intercom and sends it the unlock command
- Never unlocks a different door: if you have several intercoms and haven't chosen a default, or your default is no longer on your account, it opens the list so you can choose

## Important Notes and Limitations

- **Token Expiration**: If you don't use the extension for a while, Ring may expire the stored sign-in. When this happens, you'll be asked to run Authenticate again.
- **Network Dependency**: Requires an active internet connection to communicate with Ring's servers.

## Troubleshooting

If you encounter issues:

1. Try re-authenticating using the "Authenticate" command
2. Ensure you have a stable internet connection
3. Check whether your Ring Intercom is online and charged in "Select Default Intercom" or the Ring app
