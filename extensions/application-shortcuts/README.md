# Application Shortcuts

This extension simplifies the process of opening command-line applications by integrating them with Raycast. Normally, to open a command-line app, you would need to open a terminal and type the corresponding command. With this tool, you can easily open these applications through Raycast, making it more efficient and seamless.

For Android Emulator applications, the extension goes a step further. It automatically lists all available emulators, allowing you to select and launch the desired one with a few clicks, eliminating the need for manual command entry.

## Getting Started

### Configuring Your PATH

Modify your `~/.bashrc` file with the following line:

```sh
export PATH="/opt/homebrew/bin:$PATH"
```

### Android Emulator

Create a symbolic link for the emulator:

```sh
ln -s ~/Library/Android/sdk/emulator/emulator /usr/local/bin
```

### Android Scrcpy

Install [scrcpy](https://github.com/Genymobile/scrcpy)

### React DevTools

Install [React DevTools](https://github.com/facebook/react/tree/main/packages/react-devtools)
