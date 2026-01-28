# Code Execution Changelog

## [Python Modules & AppleScript] - December 7, 2024

With this update, Code Execution now has the full powers of Python Modules, the Command Line, and also AppleScript. Anything you can dream, Code Execution can do.

### What's New?

* 🍎 **AppleScript Support**: Code Execution can now write and run AppleScript, to automate system tasks
* 🐍 **A Better Python**: Code Execution now automatically uses *your* Python installation, instead of the macOS Python installation, which allows things like using Modules
* 📦 **Automatic Module Installation**: When Code Execution fails to run Python because a module is missing, it'll automagically suggest to install the modules with a Bash script!

### Other Changes

* Both Bash and Python tools now take `$PATH` from your default non-interactive shell
* There are new, clearer icons for Bash, Python, and AppleScript tools so that the language you are running is clear on a glance


## [Initial Version] - December 5, 2024

The powers of Python and Bash, in the comfort of Raycast!

Allow Raycast AI to generate and run Python and Bash code to satisfy your requests. It can do anything from quick and accurate calculations to pulling code from GitHub.