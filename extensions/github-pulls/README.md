# Github extension

> Extension to quickly consult team repositories and pull requests and open them

## Configuration

| Name         | Required | Description                                                                                       |
|--------------|----------|---------------------------------------------------------------------------------------------------|
| url          | Yes      | Github url, default is https://github.com/                                                        |
| token        | Yes      | Github token, generate new one at https://github.com/settings/tokens                              |
| repositories | Yes      | Display info and pull requests only for those repositories (format: owner/name separated by coma) |

Note: to use with organization, don't forget to configure SSO for the token.

## Pull command

- List pull requests with some filters and with some details and open them
