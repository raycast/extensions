# Slowed + Reverb

This extension allows you to slow down or speed up songs that you have stored locally.

Here are the options available:

- **Slowed + Reverb**: Slows down the song by a factor of `0.8` + `reverb`.
- **Slowed**: Slows down the song by a factor of `0.8`.
- **Reverb**: Adds `reverb` to the song.
- **Nightcore**: Speeds up the song by a factor of `1.2`.

## Installation

To use this extension, you are required to have `sox` installed on your system. You can install it by running the following command:

```bash
brew install sox
```

If you have sox installed in some other path, it will **most likely** still work, as the extension checks for a bunch of common paths. You can set the path manually in the extension settings.

## Configuration

You can configure the extension by going to the settings of the extension.

Here are the options available:

- **Sox Path**: The path to the sox executable - usually no change needed here.
- **Default Slowed Speed**: The default speed to slow down the song by.
- **Default Nightcore Speed**: The default speed to speed up the song by.
