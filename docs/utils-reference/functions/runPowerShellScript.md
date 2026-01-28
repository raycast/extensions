# `runPowerShellScript`

Function that executes an PowerShell script.

{% hint style="info" %}
Only available on Windows
{% endhint %}

## Signature

```ts
function runPowerShellScript<T>(
  script: string,
  options?: {
    signal?: AbortSignal;
    timeout?: number;
    parseOutput?: ParseExecOutputHandler<T>;
  },
): Promise<T>;
```

### Arguments

- `script` is the script to execute.

With a few options:

- `options.signal` is a Signal object that allows you to abort the request if required via an AbortController object.
- `options.timeout` is a number. If greater than `0`, the parent will send the signal `SIGTERM` if the script runs longer than timeout milliseconds. By default, the execution will timeout after 10000ms (eg. 10s).
- `options.parseOutput` is a function that accepts the output of the script as an argument and returns the data the hooks will return - see [ParseExecOutputHandler](#parseexecoutputhandler). By default, the function will return `stdout` as a string.

### Return

Returns a Promise which resolves to a string by default. You can control what it returns by passing `options.parseOutput`.

## Example

```tsx
import { showHUD } from "@raycast/api";
import { runPowerShellScript } from "@raycast/utils";

export default async function () {
  const res = await runPowerShellScript(
    `
Write-Host "hello, world."
`,
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
