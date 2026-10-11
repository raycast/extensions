# Secrets and `.env` files

Strict, no exceptions.

- **Never read `.env` files.** That means no Read tool, no `cat`, `head`,
  `tail` or `less`, no `grep` that prints lines, and nothing else that puts
  their contents into context. This covers every variant (`.env`,
  `.env.local`, `.env.production`, …). The only exception is `.env.example`,
  the committed template.
- **Set a variable blind**, by locating and overwriting it:
  1. Check whether it exists without printing anything: `grep -q '^KEY=' .env`
  2. If it exists, replace the line in place: `sed -i '' 's|^KEY=.*|KEY=<value>|' .env`
     on macOS, or `sed -i` on Linux. Pick a delimiter that isn't in the value.
  3. If it doesn't exist, append it: `printf 'KEY=<value>\n' >> .env`
  4. Verify with the exit code or `grep -c '^KEY=' .env`. Never print the file.
- **Editors that need to read a file first can't be used on `.env`.** Use the
  shell commands above.
- **If a secret ever shows up in output**, stop, point it out, and recommend
  rotating it. Never echo, log or commit secret values.

## Access tokens

- **Tokens only ever come from the `accessToken` password preference**,
  which Raycast stores encrypted.
- **Never hardcode a real token, commit one, log one or put one in a test
  fixture.** Use `"test-token"`.
- **Never put a token in an error message or a URL.**
- **If one shows up in output**, flag it and tell the user to revoke it at
  `<instance>/setting#access-token`.
