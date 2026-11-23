import { appendFileSync } from "node:fs";

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
  "login-wait": ["login"],
  "login-slow-stop": ["login"],
  "login-url-fail": ["login"],
  "login-finishing": ["login"],
  "login-fail": ["login"],
  "login-fail-unknown": ["login"],
  "malformed-json": ["vault", "list", "--output", "json"],
  "json:vaults-array": ["vault", "list", "--output", "json"],
  "json:vaults-wrapper": ["vault", "list", "--output", "json"],
  "json:vault-shares": ["share", "list", "--only-vaults", "true", "--output", "json"],
  "json:item-shares": ["share", "list", "--only-items", "true", "--output", "json"],
  "json:vault-members": ["vault", "member", "list", "--share-id=vault-1", "--output", "json"],
  "json:items-full": ["item", "list", "--share-id=vault-1", "--output", "json", "--show-secrets"],
  "json:folders": ["folder", "list", "--share-id=vault-1", "--output", "json"],
  "json:folders-wrapper": ["folder", "list", "--share-id=vault-1", "--output", "json"],
  "json:item-view": ["item", "view", "--share-id=vault-1", "--item-id=item-login", "--output", "json"],
  "json:totps-wrapper": ["item", "totp", "--share-id=vault-1", "--item-id=item-1", "--output", "json"],
  "json:totps-flat": ["item", "totp", "--share-id=vault-1", "--item-id=item-1", "--output", "json"],
};

if (mode in expectedArgs && JSON.stringify(args) !== JSON.stringify(expectedArgs[mode])) {
  console.error(`Unexpected arguments for ${mode}`);
  process.exit(3);
}

// Schema-derived subsets of pass-cli 2.5.1 JSON output (tag 2.5.1, commit 5d0cfbf):
// https://github.com/protonpass/pass-cli/tree/5d0cfbf8b7875550ce2494dd322032c34a3a6a72/pass-cli/src/commands
const fixtures = {
  "vaults-array": [{ share_id: "vault-1", name: "Personal", item_count: 3, role: "Owner" }],
  "vaults-wrapper": {
    vaults: [{ name: "Work", vault_id: "vault-id-2", share_id: "vault-2" }],
  },
  "vault-shares": {
    shares: [
      { id: "vault-1", name: "Personal", share_type: "Vault", share_role: "Owner" },
      { id: "vault-2", name: "Work", share_type: "Vault", share_role: "Viewer" },
      {
        id: "vault-3",
        name: "Shared Projects",
        share_type: "Vault",
        share_role: { Custom: { name: "4", permission: 2 } },
      },
    ],
  },
  "item-shares": {
    shares: [
      { id: "item-share-1", name: "Streaming", share_type: "Item", share_role: "Viewer" },
      { id: "item-share-2", name: "Door Code", share_type: "Item", share_role: "Editor" },
    ],
  },
  "vault-members": [
    {
      member_share_id: "member-1",
      email: "alice@example.com",
      name: "Alice",
      is_group_share: false,
      role: "Owner",
      target_type: "Vault",
    },
    {
      member_share_id: "member-2",
      email: "bob@example.com",
      name: "Bob",
      is_group_share: false,
      role: "Viewer",
      target_type: "Vault",
    },
  ],
  "items-full": {
    items: [
      {
        id: "item-login",
        state: "Active",
        create_time: "2025-01-15T08:00:00",
        modify_time: "2025-06-01T12:34:56",
        folder_id: "folder-cards",
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
  // pass/src/domain/models/folder.rs: content is FolderData, whose only field is the name.
  folders: [
    { id: "folder-banking", share_id: "vault-1", parent_folder_id: null, content: { name: "Banking" } },
    { id: "folder-cards", share_id: "vault-1", parent_folder_id: "folder-banking", content: { name: "Cards" } },
  ],
  "folders-wrapper": { folders: [{ folder_id: "folder-banking", folder_name: "Banking", parent_id: null }] },
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
  // `item list` without `--show-secrets` (pass-cli 2.7.1's ItemSummary): no contents, only the type.
  "items-summary": {
    items: [
      {
        id: "item-login",
        share_id: "vault-9",
        vault_id: "vault-id-9",
        state: "Active",
        flags: [],
        create_time: "2026-01-15T08:00:00",
        modify_time: "2026-06-01T12:34:56",
        last_use_time: null,
        folder_id: "folder-team",
        title: "Team Login",
        item_type: "login",
      },
      {
        id: "item-card",
        share_id: "vault-9",
        vault_id: "vault-id-9",
        state: "Active",
        flags: [],
        create_time: "2026-01-15T08:00:00",
        modify_time: "2026-01-15T08:00:00",
        last_use_time: "2026-02-03T04:05:06",
        title: "Company Card",
        item_type: "credit_card",
      },
      {
        id: "item-old",
        share_id: "vault-9",
        vault_id: "vault-id-9",
        state: "Trashed",
        flags: [],
        create_time: "2026-01-15T08:00:00",
        modify_time: "2026-01-15T08:00:00",
        last_use_time: null,
        title: "Old Note",
        item_type: "note",
      },
    ],
    folders: [{ folder_id: "folder-team", folder_name: "Team", parent_id: null }],
  },
  "totps-wrapper": { totps: { totp: "123456", recovery: "654321" } },
  "totps-flat": { primary: "111222", secondary: "333444" },
};

switch (mode) {
  // A vault shared with a flag that hides its items' contents: pass-cli 2.7.1 refuses them ("not allowed by policy"),
  // and still lists the items' names. FAKE_PASS_CLI_LOG, when set, gets each command's arguments.
  case "policy-hidden":
    if (process.env.FAKE_PASS_CLI_LOG) appendFileSync(process.env.FAKE_PASS_CLI_LOG, `${args.join(" ")}\n`);
    if (args[1] === "view" || args.includes("--show-secrets")) {
      console.error("Error: Viewing the contents of this item is not allowed by policy");
      process.exitCode = 1;
    } else {
      console.log(JSON.stringify(fixtures["items-summary"]));
    }
    break;
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
  case "login-wait":
    console.log(
      `Please open the following URL in your browser:\n${loginUrl}\nWaiting for authentication to complete...`,
    );
    process.on("SIGTERM", () => process.exit(0));
    setInterval(() => {}, 1_000);
    break;
  case "login-slow-stop":
    console.log(`Please open the following URL in your browser:\n${loginUrl}\n`);
    process.on("SIGTERM", () => setTimeout(() => process.exit(1), 500));
    setInterval(() => {}, 1_000);
    break;
  case "login-finishing":
    console.log(
      `Please open the following URL in your browser:\n${loginUrl}\nWaiting for authentication to complete...`,
    );
    setTimeout(() => console.log("Web authentication complete, setting up your account"), 50);
    process.on("SIGTERM", () => process.exit(0));
    setInterval(() => {}, 1_000);
    break;
  // pass-cli 2.7.1 says it differently once the browser login is done.
  case "login-finishing-2.7.1":
    console.log(
      `Please open the following URL in your browser:\n${loginUrl}\nWaiting for authentication to complete...`,
    );
    setTimeout(() => console.log("Web authentication succeeded. Pulling your data, this may take a moment..."), 50);
    process.on("SIGTERM", () => process.exit(0));
    setInterval(() => {}, 1_000);
    break;
  case "login-finishing-2.7.1-fail":
    console.log(
      `Please open the following URL in your browser:\n${loginUrl}\nWaiting for authentication to complete...`,
    );
    console.log("Web authentication succeeded. Pulling your data, this may take a moment...");
    setTimeout(() => {
      console.error("Error: Something unexpected");
      process.exitCode = 1;
    }, 50);
    break;
  case "login-url-fail":
    console.log(
      `Please open the following URL in your browser:\n${loginUrl}\nWaiting for authentication to complete...`,
    );
    setTimeout(() => {
      console.error("Error: This operation requires an authenticated client");
      process.exitCode = 1;
    }, 50);
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
  case "version-silent":
    break;
  case "version-hang":
    setInterval(() => {}, 1_000);
    break;
  default:
    // As pass-cli 2.5.1 prints `pass-cli --version`, with the version after the colon.
    if (mode?.startsWith("version:")) {
      if (JSON.stringify(args) === JSON.stringify(["--version"])) {
        console.log(`pass-cli ${mode.slice(8)} (0123abc)`);
      } else {
        console.error(`Unexpected arguments for ${mode}`);
        process.exitCode = 3;
      }
    } else if (mode?.startsWith("json:")) {
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
