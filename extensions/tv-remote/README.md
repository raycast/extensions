# TV Remote

Control your Sony BRAVIA TV picture settings directly from Raycast.

## Features

- **Auto-Discovery**: Scans your local network to find compatible Sony BRAVIA TVs.
- **Smart Picture Settings**: Automatically applies optimal picture settings based on the current content mode:
  - **Dolby Vision**: Applies `dvDark` mode + sharpness 20.
  - **Standard**: Applies `imax` mode + sharpness 20.

## Usage

1. **Connect**: Ensure your Mac is on the same WiFi network as your Sony TV.
2. **Run**: Open Raycast and run the **Apply TV Settings** command.
3. **Scan**: The extension will automatically scan specifically for Sony TVs.
4. **Apply**: Once found, it will read the current picture mode and apply the optimized settings.

## Credits

Based on this gist from Dan Abramov: https://gist.github.com/gaearon/9c4469fb8e4376bab32bd5bda942861b
