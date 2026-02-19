# Documentation

This extension is editing the `config.plist` configuration file of the Mac Mouse Fix app.
The file is located at `~/Library/Application Support/com.nuebling.mac-mouse-fix/config.plist` by default.

A custom config path can be specified in the extension preferences if your config file is in a different location.

It contains entries for all settings of the MMF app. Editing a value in the file will need a reload of the MMF helper process for the update to appear in the app.

## MMF Helper Process

The helper runs as `com.nuebling.mac-mouse-fix.helper` and uses `CFMessagePort` to communicate with the main process.

The `update_mmf_helper.m` file (binary `update_mmf_helper` in `/assets`) sends the message `configFileChanged` to the helper process to propagate the config file changes.

## Compile MMF Helper

Run the following to compile the helper to a macOS universal binary.

```bash
clang -arch x86_64 -arch arm64 -fmodules update_mmf_helper.m -o update_mmf_helper
```

## Commands

There are mainly two types of commands at the moment:

- toggle command -> they toggle a single setting of the app
- set command -> they show a list of possible settings you can choose from

## Current Commands

See `utils/config.ts` for the configuration of all commands and their counterpart in the MMF `config.plist` file.
