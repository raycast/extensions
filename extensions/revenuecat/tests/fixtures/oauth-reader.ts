import { appendFile, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { createTokenReader, OAuthTokenError } from "../../src/lib/oauth-core";
import { createTokenLock } from "../../src/lib/oauth-lock";

const directory = process.argv[2];
const tokenFile = join(directory, "tokens.json");
let firstRead = true;
const read = createTokenReader(
  {
    async getTokens() {
      const tokens = JSON.parse(await readFile(tokenFile, "utf8"));
      if (firstRead) {
        firstRead = false;
        await writeFile(join(directory, `ready-${process.pid}`), "");
        // Both isolated processes must read the same expired token before refreshing.
        while ((await readdir(directory)).filter((name) => name.startsWith("ready-")).length < 2) {
          await setTimeout(10);
        }
      }
      return { ...tokens, isExpired: () => tokens.accessToken === "expired" };
    },
    async setTokens(tokens) {
      await writeFile(
        tokenFile,
        JSON.stringify({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token }),
      );
    },
    async removeTokens() {
      throw new Error("A competing command must never erase the connection");
    },
  },
  async () => {
    await appendFile(join(directory, "exchanges"), "refresh\n");
    await setTimeout(100);
    const current = JSON.parse(await readFile(tokenFile, "utf8"));
    if (current.refreshToken !== "original") throw new OAuthTokenError("invalid_grant", "Already rotated");
    return { access_token: "replacement", refresh_token: "rotated", token_type: "Bearer", expires_in: 3600 };
  },
  createTokenLock(directory),
);
read()
  .then((token) => process.stdout.write(token || "missing"))
  .catch((error) => {
    process.stderr.write(String(error));
    process.exitCode = 1;
  });
