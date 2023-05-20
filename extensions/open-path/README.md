# Open Path With... Raycast Extension 🚀

This is the "Open Path With..." extension for Raycast! This nifty extension empowers you to open a path in a custom application of your choice. It comes with Visual Studio Code & Xcode as default choices, plus the capacity to add more of your favorite apps 🖥️.

## Features 🌟

1. **Open Path in Custom Apps:** You can pick and choose from up to 10 custom applications to open your paths in. Go wild! 🎉

2. **Clipboard Path Reading:** Clip and rip! The extension can snoop your clipboard content and try to turn it into a path 📋.

3. **History Preservation:** The extension has an elephant's memory 🐘. It will remember the paths you've traipsed through and keeps a log. You can set the length of this log as per your preference.

## Installation 🛠️

To get the "Open Path With..." extension up and running on your system, first ensure Raycast is installed. Next, clone this repository, and run the following commands in your terminal, from the root directory of the cloned repository:

```bash
npm install
npm run build
raycast extension add
```

Voila! The extension is now ready for action.

## Usage 🎮

Once installed, you can use the "Open Path With..." command in Raycast to open paths in your selected custom applications. By default, the command reads from your clipboard and tries to transform the content into a path, but you can toggle this off in the preferences if you'd like.

You can also set a limit for the history preservation in the preferences. The extension will remember the last 20 paths you've opened by default, but you can tweak this limit to any number you prefer.

## Preferences ⚙️

The following preferences are available for the "Open Path With..." command:

1. **Read Clipboard Possible Path:** If checked, the extension will read the clipboard and attempt to load it as a path.

2. **History Store Limit:** Decide how many paths the extension will remember. The default is set to 20.

3. **Custom App #1-#10:** Choose up to 10 custom applications to open paths in. The defaults for the first two applications are Visual Studio Code and Xcode.

## License 📝

This project is under the umbrella of the MIT License.

## Contributing 🤝

Community contributions are heartily welcome! If you've got a feature request, bug report, or a proposal to enhance the extension, feel free to open an issue on this repository.

## Author 👨‍💻

ProAlexUSC

I'm all ears for any questions or suggestions! Feel free to reach out 📬.