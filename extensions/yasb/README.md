# Raycast YASBC Extension

Simple Raycast extension to run yasbc commands from Raycast.

It literally just runs `yasbc` commands in the terminal, so you need to have [YASBC](https://github.com/amnweb/yasb) installed and configured on your machine.

## Limitations

- Windows Only (Obviously)
- Raycast doesn't support dynamic arguments, so the screen name has to be typed manually.
- No support for `yasbc log` command as that tails the logs in the terminal and I don't think Raycast supports that.
- No support for `yasbc reset` command because I don't want people to accidentally break their setups.
- No support for `yasbc help` command because it's not really useful in Raycast.

## Development

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development server
4. Raycast should automatically pick up the extension
5. Make changes and test them in Raycast
6. When you're done, run `npm run build` to ensure everything is built correctly
7. Open a pull request with your changes
8. Celebrate your contribution to the Raycast YASBC Extension!
