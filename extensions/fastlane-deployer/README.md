# Fastlane Deployer

Run and monitor Fastlane deployments across multiple iOS and Android projects from Raycast.

## Features

- Configure multiple Fastlane projects.
- Run iOS and Android lanes.
- Store only env file paths, not raw secrets.
- Load dotenv-style env files at deployment time.
- Use `*_PATH` helpers for multiline-sensitive secret files.
- Confirm production deployments and preflight warnings.
- Monitor detached deployment status, progress, warnings, errors, and logs.
- Cancel running deployments and reveal or export log files.

## Getting Started

1. Open `Manage Projects`.
2. Add a project root, Fastlane working directory, optional env file, shell, and lane JSON.
3. Use `Deploy` to start a configured lane.
4. Use `Monitor Deployments` to watch running and recent deployments.

## Env Files

The extension stores only the env file path. Values are loaded when a deployment starts.

```sh
MATCH_PASSWORD=...
APP_STORE_CONNECT_API_KEY_ID=...
APP_STORE_CONNECT_API_KEY_ISSUER_ID=...
APP_STORE_CONNECT_API_KEY_CONTENT_PATH=/Users/name/keys/AuthKey_ABC123.p8
```

Variables ending in `_PATH` are loaded into the matching non-path variable when that variable does not already exist. For example, `APP_STORE_CONNECT_API_KEY_CONTENT_PATH` becomes `APP_STORE_CONNECT_API_KEY_CONTENT`.

## Lane Example

```json
[
  {
    "name": "iOS Staging",
    "platform": "ios",
    "lane": "beta_staging",
    "command": "bundle exec fastlane ios beta_staging",
    "environment": "staging"
  },
  {
    "name": "iOS Production",
    "platform": "ios",
    "lane": "beta_production",
    "command": "bundle exec fastlane ios beta_production",
    "environment": "production",
    "isProduction": true,
    "expectedBranch": "main",
    "requiredEnvVars": ["APP_STORE_CONNECT_API_KEY_CONTENT"]
  }
]
```

## Progress

Fastlane does not expose a universal progress percentage, so progress is estimated from output. Explicit progress markers are supported:

```txt
::raycast-stage name=building percent=65
```

Fallback stage detection covers common Fastlane output such as `match`, `increment_build_number`, `gradle`, `xcodebuild`, `build_app`, `upload_to_testflight`, and `upload_to_play_store`.
