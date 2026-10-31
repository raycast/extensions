# Contributing to Local AI

Thanks for helping out. For anything bigger than a small fix, open a [GitHub issue](https://github.com/MatloobAltaf/local-ai-raycast/issues) to discuss your idea first so we can agree on the approach before you spend time on it.

## Reporting a bug

Report bugs in [GitHub issues](https://github.com/MatloobAltaf/local-ai-raycast/issues). Please include:

- Your macOS version
- What you selected or typed
- The command and its prompt
- What happened, and what you expected
- The output of **Check Setup**

Don't include private text. Replace it with a short example that shows the same problem.

## Development setup

```
npm install
npm run dev
```

Before opening a pull request, run:

```
npm test
npm run lint
npm run build
```

Send pull requests to the `extensions/local-ai` folder of the [Raycast extensions repository](https://github.com/raycast/extensions).

## Code layout

Pure logic lives in `src/lib`, with colocated tests and no Raycast imports. Code that uses the Raycast API lives in `src/services`, `src/hooks` and `src/components`.

## One rule

User text must only ever reach the model on stdin, never as command arguments.
