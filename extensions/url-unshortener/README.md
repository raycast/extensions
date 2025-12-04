# URL Unshortener

Unshorten/expand those pesky short links in your clipboard or text selection, enhancing your privacy and security.

## Features

- URL Validation: URL Unshortener checks whether your selected or clipboard text is a valid URL, ensuring reliability and effectiveness.
- Smart Selection: Checks selection and clipboard for URLs. If both are valid, the selected text takes precedence.
- Quick Command: Run the extension through the command menu or by using a keyboard shortcut of your choice, the expanded url gets copied to your clipboard and pasted to your current app.
- Interactive Command: Run the extension through the command menu or by using a keyboard shortcut of your choice, every redirection is shown in a list view and you can select the one you want to copy to your clipboard.

## Usage

1. Select a shortened URL or copy it to your clipboard.
2. Run the extension through the command menu or by using a keyboard shortcut of your choice.
3. The expanded URL is copied to your clipboard.

## Future Plans

- Add options to trim query strings from the final URL.

## Limitations

URL Unshortener only works with HTTP redirects, meaning that it cannot expand shortened URLs that use other methods, such as JavaScript. I created a version that used Puppeteer to handle these cases, but it was too slow to be practical. I may revisit this in the future if I can find a way to speed up the process or use a third-party API. If you have any ideas, please let me know!

## License

MIT
