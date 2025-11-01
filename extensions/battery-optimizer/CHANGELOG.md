# Battery Optimizer Changelog

## [Feature] - 2025-06-04

Add support for BATT in addition to BCLM for macOS 15+ compatibility

- Add dropdown preference to toggle between BCLM and BATT tools
- Implement utility functions for BATT support
- Create abstraction layer to handle both battery management tools
- Update all commands to work with either tool based on preference
- Add custom path setting for BATT executable
- Update documentation to explain differences between tools
- Enhance menu bar to show which tool is being used

## [Feature] - 2024-09-22

Add menu bar for Battery Optimizer to show charging threshold and enable/disable Battery Optimizer.

## [Feature] - 2024-06-17

Set custom path for BCLM: Update package.json and utils.ts

- Add customBCLMPath preference to package.json
- Update initBCLM.ts to use preferences in getPreference.ts and handle customBCLMPath
- Use a custom path for BCLM if none is found in the system. Usually, this can happen if someone has a custom brew installation.

## [Add Extension] - 2024-05-16

- Add Battery Optimizer
