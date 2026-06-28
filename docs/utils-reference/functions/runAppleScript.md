# `runAppleScript`

Function that executes an AppleScript script.

{% hint style="info" %}
Only available on macOS
{% endhint %}

## Signature

There are two ways to use the function.

The first one should be preferred when executing a static script.

```ts
function runAppleScript<T>(
  script: string,
  options?: {
    humanReadableOutput?: boolean;
    language?: "AppleScript" | "JavaScript";
    signal?: AbortSignal;
    timeout?: number;
    parseOutput?: ParseExecOutputHandler<T>;
  },
): Promise<T>;
```

The second one can be used to pass arguments to a script.

```ts
function runAppleScript<T>(
  script: string,
  arguments: string[],
  options?: {
    humanReadableOutput?: boolean;
    language?: "AppleScript" | "JavaScript";
    signal?: AbortSignal;
    timeout?: number;
    parseOutput?: ParseExecOutputHandler<T>;
  },
): Promise<T>;
```

### Arguments

- `script` is the script to execute.
- `arguments` is an array of strings to pass as arguments to the script.

With a few options:

- `options.humanReadableOutput` is a boolean to tell the script what form to output. By default, `runAppleScript` returns its results in human-readable form: strings do not have quotes around them, characters are not escaped, braces for lists and records are omitted, etc. This is generally more useful, but can introduce ambiguities. For example, the lists `{"foo", "bar"}` and `{{"foo", {"bar"}}}` would both be displayed as ‘foo, bar’. To see the results in an unambiguous form that could be recompiled into the same value, set `humanReadableOutput` to `false`.
- `options.language` is a string to specify whether the script is using [`AppleScript`](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/introduction/ASLR_intro.html#//apple_ref/doc/uid/TP40000983) or [`JavaScript`](https://developer.apple.com/library/archive/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/Articles/Introduction.html#//apple_ref/doc/uid/TP40014508-CH111-SW1). By default, it will assume that it's using `AppleScript`.
- `options.signal` is a Signal object that allows you to abort the request if required via an AbortController object.
- `options.timeout` is a number. If greater than `0`, the parent will send the signal `SIGTERM` if the script runs longer than timeout milliseconds. By default, the execution will timeout after 10000ms (eg. 10s).
- `options.parseOutput` is a function that accepts the output of the script as an argument and returns the data the hooks will return - see [ParseExecOutputHandler](#parseexecoutputhandler). By default, the function will return `stdout` as a string.

### Return

Returns a Promise which resolves to a string by default. You can control what it returns by passing `options.parseOutput`.

## Example

```tsx
import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function () {
  const res = await runAppleScript(
    `
on run argv
  return "hello, " & item 1 of argv & "."
end run
`,
    ["world"],
  );
  await showHUD(res);
}
```

## Types

### ParseExecOutputHandler

A function that accepts the output of the script as an argument and returns the data the function will return.

```ts
export type ParseExecOutputHandler<T> = (args: {
  /** The output of the script on stdout. */
  stdout: string;
  /** The output of the script on stderr. */
  stderr: string;
  error?: Error | undefined;
  /** The numeric exit code of the process that was run. */
  exitCode: number | null;
  /** The name of the signal that was used to terminate the process. For example, SIGFPE. */
  signal: NodeJS.Signals | null;
  /** Whether the process timed out. */
  timedOut: boolean;
  /** The command that was run, for logging purposes. */
  command: string;
  /** The options passed to the script, for logging purposes. */
  options?: ExecOptions | undefined;
}) => T;
```
