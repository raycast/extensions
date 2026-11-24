# ray.so

Create code images with [ray.so](https://ray.so).

## Default Image Settings

Open the extension preferences in Raycast to choose your default **Theme**, **Padding**, **Dark Mode**, and **Background**. Both commands use these settings.

- **Create Image from Code**: Paste your code, optionally add a title, and adjust settings for that snippet. Use **Configure Default Settings** in the action panel to change the defaults. Theme, padding, dark mode, and background overrides only apply to the current snippet; language selection is remembered.
- **Generate Image**: Select code in another app and run the command to open ray.so with your default settings.

Both commands open the ray.so editor in your browser, where you can make further changes and export the image.

If you previously configured Generate Image, check your defaults in the extension preferences after updating; these settings are now shared by both commands.

## Raycast AI

Mention `@ray-so` in Raycast AI to create a code image or explore image settings:

- “@ray-so Create an image of `console.log('Hello, world!')` using my defaults.”
- “@ray-so Make a link for `print('Hello')` with the Noir theme, light mode, no background, and 32px padding. Don't open the browser.”
- “@ray-so What themes and languages are available, and what are my defaults?”

**Create Code Image** uses your saved preferences unless you request overrides. It opens the ray.so editor by default and returns a link; it can also return just the link. Export the finished image from the editor. **Get Image Options** lists current themes, languages, padding, and saved defaults. AI overrides apply only to that snippet and do not change your preferences.
