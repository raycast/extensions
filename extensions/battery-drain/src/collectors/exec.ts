import { execFile } from "node:child_process";

export type Runner = (cmd: string, args: string[]) => Promise<string>;

// Numbers and messages in the C locale, so top and pmset always print "12.5" and English words;
// text in UTF-8, since under LC_ALL=C ps escapes every non-ASCII byte ("Çalışma" → "M-CM^Gal…").
// Any LC_* the user set (LC_ALL, LC_NUMERIC…) would override that, so all of them are dropped.
export function commandEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const inherited = Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith("LC_")));
  return { ...inherited, LANG: "C", LC_CTYPE: "UTF-8" };
}

const ENV = commandEnv(process.env);

export const run: Runner = (cmd, args) =>
  new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 5000, maxBuffer: 4 * 1024 * 1024, env: ENV }, (error, stdout) =>
      // Output rides along with a failure: some tools exit non-zero with a meaningful (or empty) answer.
      error ? reject(Object.assign(error, { stdout })) : resolve(stdout),
    );
  });
