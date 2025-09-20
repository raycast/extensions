# Unkey Changelog

## [Modernize + Update Broken Endpoints] - 2025-05-19

- Modernize to use latest Raycast config (no more `node-fetch`)
- Update the following endpoints:
    1. **getApiInfo** (apis/`${apiId}` -> apis.getApi)
    2. **getApiKeys** (apis/`${apiId}`/keys -> apis.listKeys)
    3. **revokeKey** (keys/`${keyId}` -> keys.deleteKey)
    4. **createKey** (keys -> keys.createKey)

## [Initial Version] - 2023-08-14