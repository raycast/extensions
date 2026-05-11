# Slowed + Reverb

## Description

This extension allows you to slow down or speed up songs that you have stored locally.

Here are the options available:

- **Slowed + Reverb**: Slows down the song by a factor of `0.8` + `reverb`.
- **Slowed**: Slows down the song by a factor of `0.8`.
- **Reverb**: Adds `reverb` to the song.
- **Nightcore**: Speeds up the song by a factor of `1.2`.

The extension requires `sox` to function properly, but informs the user and tries to find the library in a bunch of common places, and also allows the user to customise the location.

### How to use

To use the extension, simply select an audio file in the Finder, and open Raycast and select the type of audio conversion you want to make. It will add your converted songs into the same folder.

## Screencast

![Raycast 2025-03-01 at 15 44 38](https://github.com/user-attachments/assets/1720b235-ed32-4737-a2df-d9f4c0c9e661)

## Settings

You can modify the defaults of Slowed and Nightcore speeds to match your tastes, as well as put a custom path for sox if you require a special config (but should not be needed in most cases).

<img width="307" alt="image" src="https://github.com/user-attachments/assets/9d044e7f-2789-470e-917e-1b5623ddaefe" />

## Checklist

- [x] I read the [extension guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [x] I read the [documentation about publishing](https://developers.raycast.com/basics/publish-an-extension)
- [x] I ran `npm run build` and [tested this distribution build in Raycast](https://developers.raycast.com/basics/prepare-an-extension-for-store#metadata-and-configuration)
- [x] I checked that files in the `assets` folder are used by the extension itself
- [x] I checked that assets used by the `README` are placed outside of the `metadata` folder
