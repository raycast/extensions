# Unkey Changelog

## [Migrate to Unkey SDK w/ v2 Endpoints] - 2025-10-16

- Now using Unkey SDK w/ v2 Endpoints with better performance: updates and deletions are now _instant_
- Keys are now paginated
- Screens moved to separate files for better maintainability

## [Modernize + Update Broken Endpoints] - 2025-05-19

- Modernize to use latest Raycast config (no more `node-fetch`)
- Update the following endpoints:
    1. **getApiInfo** (apis/`${apiId}` -> apis.getApi)
    2. **getApiKeys** (apis/`${apiId}`/keys -> apis.listKeys)
    3. **revokeKey** (keys/`${keyId}` -> keys.deleteKey)
    4. **createKey** (keys -> keys.createKey)

## [Initial Version] - 2023-08-14