# AzTU LMS Raycast Extension

Log in to the Azerbaijan Technical University (AzTU) Learning Management System (LMS) in one step from Raycast.

## Commands

### Login in Browser (Background)

- Launches the AzTU single-sign-on (SSO) flow and opens the LMS dashboard when a fresh login link is required.
- Stores the generated login link locally for reuse within the next hour to reduce repeated authentications.

### Delete Session (Background)

- Clears the cached login link.
- Use this command when you want to fully sign out or request a brand-new SSO link.

## Privacy & Data Handling

- Authentication details remain on your machine.
- Generated login links are cached locally to reduce the frequency of login prompts.
- Run the **Delete Session** command at any time to clear cached authentication artifacts.

## Disclaimer

- This project is an independent, community contribution and is **not an official AzTU LMS product**.
- The extension is provided "as is" without any warranty. Use it at your own discretion and risk.
- AzTU University or its IT team are not affiliated with or responsible for this project.

## Contributing

Contributions, suggestions, and bug reports are welcome! Feel free to open an issue or submit a pull request to improve the extension's reliability and feature set.

## License

This project is released under the MIT License.
