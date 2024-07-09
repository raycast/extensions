# Shell History

Search shell command history from zsh, bash, and fish.

**Note**

If your Zsh history is not displaying correctly (it is showing as one record), it may be because Zsh history is not saving the timestamp correctly.

1. You can install `oh-my-zsh` to try to solve this problem
2. You can reconfigure the `.zshrc` file to try to fix the problem
   - Check the HIST_STAMPS setting: zsh provides an option called HIST_STAMPS, which controls whether timestamps are saved in the history. You can check your zsh configuration file (e.g. .zshrc) for the HIST_STAMPS setting. Typically, you can ensure that timestamps are logged by adding the following configuration `setopt EXTENDED_HISTORY` to your `.zshrc` file; this option will enable timestamp logging.
