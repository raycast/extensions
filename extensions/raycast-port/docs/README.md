# API Documentation

## APIs

- [AI.ask](https://github.com/raycast/extensions/blob/main/extensions/raycast-port/docs/ai-ask.md)
- [BrowserExtension](https://github.com/raycast/extensions/blob/main/extensions/raycast-port/docs/browser-extension.md)
- [WindowManagement](https://github.com/raycast/extensions/blob/main/extensions/raycast-port/docs/window-management.md)

## Tips

1. Please use `encodeURIComponent` instead of `URLSearchParams` due to the [parsing issue of Raycast deeplinks](https://github.com/raycast/extensions/issues/14016).
1. Remember to add `launchType=background` to your deeplink for a better experience.
1. Note browser URL has a [max-length limitation](https://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers). You may need to use `callbackExec` instead of `callbackOpen` as a workaround.
1. Raycast is using enums for values like `AI.Model['OpenAI_GPT4']`, you might need to look into [declaration file](https://cdn.jsdelivr.net/npm/@raycast/api/types/index.d.ts) to find out is real value. For JavaScript users, you can simply import the `@raycast/api` to use them.
1. If you have any questions, you can always look into the source code of the port.
1. All errors will be set the result object in an array.
