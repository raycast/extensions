# Vault extension

> Extension to work with [vault](https://www.vaultproject.io/) secrets

## Configuration

| Name               | Required                     | Description                                                       |
|--------------------|------------------------------|-------------------------------------------------------------------|
| url                | Yes                          | -                                                                 |
| loginMethod        | No                           | Default : ldap (available: ldap, token)                           |
| ldap               | Only if loginMethod is ldap  | -                                                                 |
| password           | Only if loginMethod is ldap  | -                                                                 |
| token              | Only if loginMethod is token | -                                                                 |
| technicalPaths     | No                           | Used to hide technical paths in results list (separated by space) |
| favoriteNamespaces | No                           | Used quickly switch between namespaces (separated by space)       |
| enableWrite        | No                           | Default: true - used to show write actions                        |
| enableDelete       | No                           | Default: false - used to show delete actions                      |

## Vault command

- Login with token or ldap/password and auto-renewal of token
- List secrets keys and search
- Display secret
    - with/without details
    - list / json mode
    - copy secret value(s)
    - save to file
- Create new secret version
- Delete/undelete/destroy secret
- Open link in UI
- Copy token
- Change namespace
- Switch to favorite namespaces
