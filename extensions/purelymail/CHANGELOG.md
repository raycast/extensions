# Purelymail Changelog

## [Added ListUser+ModifyUser Endpoints] - 2024-04-08

### Enhancements

- `Delete User` command moved from being a separate command to an action in `List Users`
- `Create Routing Rule` has been made more user friendly
- You can now filter the domains by their "isShared" and "TLD" in `List Domains`
- Changed `AddDomain` from `view` to `no-view`
- Most results are now cached

### New Endpoints

- List User
- Modify User

### Refactor:

- remove redundant error toasts
- separate useState items for better control
- api takes an optional parameter to hide toasts (for `no-view` commands)

## [Added Billing and App Password Endpoints] - 2023-10-30

### Enhancements

- Added Toasts to show Processing, Success, and Error states
- Changed DeleteUser from `view` to `no-view`

### New Endpoints

- Check Account Credit
- Create App Password
- Delete App Password

## [Initial Version] - 2023-04-13

Initial release of Purelymail Raycast Extension
