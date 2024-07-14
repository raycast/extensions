# Battery Optimizer Changelog

## [Feature] - 2024-06-17

Set custom path for BCLM: Update package.json and utils.ts

- Add customBCLMPath preference to package.json
- Update initBCLM.ts to use preferences in getPreference.ts and handle customBCLMPath
- Use a custom path for BCLM if none is found in the system. Usually, this can happen if someone has a custom brew installation.

## [Add Extension] - 2024-05-16

- Add Battery Optimizer
