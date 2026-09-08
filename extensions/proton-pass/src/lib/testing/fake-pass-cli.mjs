const mode = process.argv[2];
const args = process.argv.slice(3);
const loginUrl = "https://account.proton.me/desktop/login?app=pass#payload=FAKE_PAYLOAD_TOKEN";

const expectedArgs = {
  "auth-ok": ["info"],
  "auth-denied": ["info"],
  "login-ok": ["login"],
  "login-split-url": ["login"],
  "login-bad-host": ["login"],
  "login-garbage": ["login"],
  "login-hang": ["login"],
  "login-fail": ["login"],
  "login-fail-unknown": ["login"],
  "malformed-json": ["vault", "list", "--output", "json"],
  "json:vaults-array": ["vault", "list", "--output", "json"],
  "json:vaults-wrapper": ["vault", "list", "--output", "json"],
  "json:items-full": ["item", "list", "--share-id", "vault-1", "--output", "json", "--show-secrets"],
  "json:item-view": ["item", "view", "--share-id", "vault-1", "--item-id", "item-login", "--output", "json"],
  "json:totps-wrapper": ["item", "totp", "--share-id", "vault-1", "--item-id", "item-1", "--output", "json"],
  "json:totps-flat": ["item", "totp", "--share-id", "vault-1", "--item-id", "item-1", "--output", "json"],
};

if (mode in expectedArgs && JSON.stringify(args) !== JSON.stringify(expectedArgs[mode])) {
  console.error(`Unexpected arguments for ${mode}`);
  process.exit(3);
}

// Schema-derived subsets of pass-cli 2.3.3 JSON output (tag 2.3.3, commit 51a4c9b):
// https://github.com/protonpass/pass-cli/tree/51a4c9b110a0ffe6e81f4f5d3877b9e5a0c24112/pass-cli/src/commands
const fixtures = {
  "vaults-array": [{ share_id: "vault-1", name: "Personal", item_count: 3, role: "Owner" }],
  "vaults-wrapper": {
    vaults: [{ name: "Work", vault_id: "vault-id-2", share_id: "vault-2" }],
  },
  "items-full": {
    items: [
      {
        id: "item-login",
        state: "Active",
        content: {
          title: "Example Login",
          content: {
            Login: {
              username: "alice",
              email: "alice@example.com",
              password: "must-never-be-cached",
              urls: [{ url: "https://example.com/login" }],
              totp_uri: "otpauth://totp/Example?secret=MUST_NEVER_BE_CACHED",
            },
          },
        },
      },
      {
        id: "item-trashed",
        state: "Trashed",
        content: { title: "Deleted", content: { Note: {} } },
      },
    ],
  },
  "item-view": {
    item: {
      id: "item-login",
      content: {
        title: "Example Login",
        content: {
          Login: {
            username: "alice",
            password: "detail-password",
            urls: [{ url: "https://example.com/login" }],
          },
        },
      },
    },
    attachments: [],
  },
  "totps-wrapper": { totps: { totp: "123456", recovery: "654321" } },
  "totps-flat": { primary: "111222", secondary: "333444" },
};

switch (mode) {
  case "echo-args":
    console.log(JSON.stringify(args));
    break;
  case "auth-ok":
    break;
  case "auth-denied":
    console.error("Error: This operation requires an authenticated client");
    process.exitCode = 1;
    break;
  case "login-ok":
    console.log(
      `\nPlease open the following URL in your browser to complete authentication:\n\n${loginUrl}\n\nWaiting for authentication to complete...`,
    );
    break;
  case "login-split-url": {
    const splitAt = loginUrl.indexOf("#payload=") + 5;
    process.stdout.write(`Please open the following URL:\n${loginUrl.slice(0, splitAt)}`);
    setTimeout(() => {
      process.stdout.write(`${loginUrl.slice(splitAt)}\nWaiting for authentication to complete...\n`);
    }, 50);
    break;
  }
  case "login-bad-host":
    console.log("https://evil.com/desktop/login?app=pass#payload=BAD_HOST_TOKEN");
    break;
  case "login-garbage":
    console.log("Pass CLI changed this message and printed no browser URL.");
    break;
  case "login-hang":
    process.on("SIGTERM", () => process.exit(0));
    setInterval(() => {}, 1_000);
    break;
  case "login-fail":
    console.error("Error: This operation requires an authenticated client");
    console.error("payload=FAIL_PAYLOAD_TOKEN");
    process.exitCode = 1;
    break;
  case "login-fail-unknown":
    console.error("unexpected payload=UNKNOWN_PAYLOAD_TOKEN");
    process.exitCode = 2;
    break;
  case "malformed-json":
    console.log("{not json");
    break;
  default:
    if (mode?.startsWith("json:")) {
      const fixture = fixtures[mode.slice(5)];
      if (fixture === undefined) {
        console.error(`Unknown fixture: ${mode.slice(5)}`);
        process.exitCode = 2;
      } else {
        console.log(JSON.stringify(fixture));
      }
    } else {
      console.error(`Unknown mode: ${mode ?? "<missing>"}`);
      process.exitCode = 2;
    }
}
