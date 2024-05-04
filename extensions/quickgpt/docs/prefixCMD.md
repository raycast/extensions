The prefixCMD is a feature in the QuickGPT tool that allows you to control the behavior of the tool by prefixing your commands with specific strings.

Here are the possible values for prefixCMD and their corresponding behaviors:

- "c": The tool will respond in Chinese.
- "ne": The tool will not provide an explanation.
- "cot": The tool will remind you to take a deep breath and work on the problem step-by-step.

You can also customize the behavior of the tool by defining your own prefixCMD in the processActionPrefixCMD function. In this function, you can split your prefixCMD by commas, and then for each command in your prefixCMD, if it starts with '!', the tool will remove the command from the current prefixCMD. Otherwise, it will add the command to the current prefixCMD.

Finally, the tool will prepend the behavior of each command in the current prefixCMD to your content.

Please note that the prefixCMD feature is case-sensitive, so "c" and "C" would be treated as different prefixes.

The current default values for prefixCMD are "c" and "cot".
