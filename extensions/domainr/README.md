<p align="center">
    <img src="./assets/icon.png" width="150" height="150" />
</p>

# Domainr (Fastly Domain Search)

Initially, this extension was using [Domainr](https://domainr.com/) API via [RapidAPI](https://rapidapi.com/).

Now, we are using the Fastly Domain API directly.

## Configuration

1. `Sign up` at [Fastly](https://www.fastly.com/)
2. `Enable` 2FA to create API Token
3. `Navigate` to https://manage.fastly.com/account/personal/tokens (you will need to reauthenticate)
4. `Click` on "+ Create Token"
5. `Enter` a name e.g. "Raycast"
6. For permissions, you need to select "Read-only access (global:read)" to read account information configuration and stats
7. `Enter` this token in Preferences or at first prompt