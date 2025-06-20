# Code Runner for Raycast {⚡} 

A powerful Raycast extension that lets you write and execute small code snippets directly on your local machine, **without needing to open a browser or an online IDE**. Get instant feedback on your code and test ideas quickly, right from your Raycast launcher!

## ✨ What It Does

The Local Code Runner brings a mini-IDE experience directly into Raycast. You can:

* **Write Code**: Type or paste your code snippets.
* **Run Instantly**: Execute your code and see the output immediately.
* **Save Your Work**: Your code for each language is automatically remembered, even if you close the command.
* **Get Instant Feedback**: See output and errors directly within Raycast.
* **Copy Results**: Quickly copy any output to your clipboard.

## 🌐 What Languages Does It Support?

This tool intelligently **detects and works with** the programming languages you already have installed and configured on your system. Currently, it's designed to detect:

* **JavaScript** (if Node.js is installed)
* **Python** (if Python 3 is installed)
* **Go** (if Go is installed)
* **Swift** (if Swift is installed)

As long as these languages are properly set up on your machine (e.g., you can run `node -v`, `python3 --version`, `go version`, or `swift --version` in your terminal), this extension will find and use them. More languages may be added in the future!

## 🚀 Getting Started

To use this powerful tool:

1.  **Ensure Raycast is Installed**: Download and install Raycast from [raycast.com](https://www.raycast.com/) if you haven't already.
2.  **Install the Extension**:
    * Open your terminal.
    * Navigate to the directory where you've downloaded/cloned this extension's source code.
    * Run the Raycast development command to link it:
        ```bash
        npm install
        npm run dev
        ```
    * Raycast will prompt you to "Link" the extension. Confirm this action.
3.  **Check Your Languages**: If you plan to run code in a specific language (e.g., Python or Swift), make sure that language's runtime/interpreter is installed on your computer and accessible from your system's `PATH`.

## 💡 How to Use

1.  **Open Raycast**: Press `⌥ Space` (or your custom hotkey).
2.  **Find the Command**: Type `Run Code` and select the "Local Code Runner" command.
3.  **Automatic Detection**: On first launch (or after a fresh install), the extension will automatically scan your system for supported languages. This might take a few moments.
4.  **Choose Your Language**: Use the "Language" dropdown to select the language you want to code in.
5.  **Write Your Code**: Type or paste your code into the "Code" text area.
6.  **Run It!**: Press `⌘ Enter` (or click "Run Code" in the Action Panel) to execute your code.
7.  **See the Output**: The results (Output, Standard Error, or Execution Error) will appear directly within the Raycast form.
8.  **Refresh Languages**: If you install a new language after using the extension, simply select `✨ Detect New Languages` from the "Language" dropdown to update the list.

## ⚠️ Troubleshooting

* **"No supported languages found!"**:
    * This means the tool couldn't find any common language runtimes (like Node.js, Python 3, Go, or Swift) on your computer.
    * **Solution**: Please ensure these languages are installed correctly on your system and that their executables are accessible in your system's `PATH` environment variable. You can verify this by running `node -v`, `python3 --version`, `go version`, or `swift --version` in your terminal. If they don't show versions, they're not correctly set up.
* **"Code execution failed! Error: 'command' command not found."**:
    * Similar to the above, even if a language is listed, its specific executable might not be fully accessible to the tool's environment.
    * **Solution**: Double-check your language installation and your system's `PATH` configuration. Sometimes restarting Raycast (or your computer) helps apply new PATH changes.
* **"Code execution timed out after 5 seconds."**:
    * Your code ran for longer than the allowed 5-second limit, or it might be stuck in an infinite loop.
    * **Solution**: Review your code for logic errors, infinite loops, or very heavy computations.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./metadata/LICENSE) file for details.