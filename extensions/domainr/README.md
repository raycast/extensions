<p align="center">
    <img src="./assets/icon.png" width="150" height="150" />
</p>

# Fastly Domain Research

The [Domain Research API](https://www.fastly.com/documentation/reference/api/domain-research/) lets you programmatically retrieve algorithmic domain search results, and check domains for detailed availability.

## Configuration

### 1. Enable the Domain Research API

This extension requires access to Fastly's [**Domain Research API**](https://docs.fastly.com/products/domain-research-api), which includes 10,000 free requests per month.

1. `Sign up` at [Fastly](https://www.fastly.com/) if you don't have an account. You'll be required to provide a valid credit card number.
2. `Navigate` to [Domain Research API](https://manage.fastly.com/products/domain-research)
3. `Click` "Enable" and then "Purchase Now" to enable the API (first 10,000 requests/month are free).

### 2. Create an API Token

1. `Enable` 2FA on your Fastly account (required to create API tokens)
2. `Navigate` to [API Tokens](https://manage.fastly.com/account/personal/tokens) (you may need to reauthenticate)
3. `Click` "+ Create Token"
4. `Enter` a name, e.g. "Raycast"
5. For permissions, select **"Read-only access (global:read)"**
6. `Enter` this token in the extension's Preferences or at the first prompt

## History

This extension previously used the [Domainr](https://domainr.com/) API via [RapidAPI](https://rapidapi.com/).

It now uses the Fastly Domain Research API directly, as Domainr was [acquired by Fastly in 2023](https://www.fastly.com/press/press-releases/fastly-expands-domains-api-and-tls-capabilities-with-domainr-acquisition-and)
