# Shell Buddy

Shell Buddy will help you remember these shell commands you always forget.

## How it works

1. You enter a natural language prompt like `rename a docker volume to hello`
2. Shell buddy will apply AI to convert this to a shell command: `docker volume rename old_name hello`
3. You can either copy the command with `Cmd+J` or run the command in the terminal with `Cmd+Return`

**YOU SHOULD NEVER RUN COMMANDS YOU DON'T KNOW**

## Good to know

- Shell buddy works best with simple prompts, but can also work with more complicated prompts. It's up to you to
  make sure the command you are running is what you want to do.
- Nonsense inputs like `make a coffee run` will yield no result. **They will still deduct 1 credit**
- Commands shorter than 2 characters won't work to save credits
- If you happen to enter a prompt multiple times, Shell Buddy will pull the previous result from your command history
  to save credits

## License Keys and Credits

To prevent abuse and spam to the AI endpoint credits are needed to convert prompts.

### How it works

The first time you open Shell Buddy you will be prompted to enter a license key. Each license key has a certain amount
of credits attached to it. Credits work like this:

- One prompt conversion costs one credit
- Credits will never expire
- You can only have one license key active at a time. Overwriting the current license with a new license will not erase
  credits on the old license
- You can swap through license keys as often as you want
- You can refund unused licenses within 30 days of purchase.

### Running out of credits

When your license runs out of credits the main Raycast action will open a link to purchase more credits.

You can also purchase more credits [here](https://getshellbuddy.com/credits).

Once you have purchased more credits, you can simply enter the new license key in the command preferences and are good
to go.

**YOU SHOULD NEVER RUN COMMANDS YOU DON'T KNOW**
