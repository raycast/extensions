import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  SpotdlDownloadError,
  buildSpotdlArgs,
  runSpotdlDownload,
  spotdlHome,
  usesPrivateHome,
  writeSpotdlConfig,
} from "../src/lib/spotdl";

const SECRET = "s3cr3t-client-secret";
const base = {
  url: "https://open.spotify.com/track/x",
  destination: "/out",
  format: "mp3",
  ffmpegPath: "/ff",
  clientId: "my-client-id",
  clientSecret: SECRET,
};

describe("usesPrivateHome", () => {
  const support = "/Users/me/Library/Application Support/com.raycast.macos/extensions/the-downloader";

  it("gives the extension's own spotDL and Homebrew's a private home", () => {
    expect(usesPrivateHome(`${support}/spotdl`, support, "darwin")).toBe(true);
    expect(usesPrivateHome("/opt/homebrew/Cellar/spotdl/4.5.2/libexec/bin/spotdl", support, "darwin")).toBe(true);
  });

  it("leaves other installs alone — a `pip install --user` spotDL finds its packages through HOME", () => {
    expect(usesPrivateHome("/Users/me/Library/Python/3.13/bin/spotdl", support, "darwin")).toBe(false);
    expect(usesPrivateHome(`${support}-other/spotdl`, support, "darwin")).toBe(false);
  });
});

describe("buildSpotdlArgs with a private home", () => {
  it("reads the credentials from the config file, keeping the secret off the command line", () => {
    const args = buildSpotdlArgs({ ...base, userAuth: true }, true);
    expect(args).toEqual(expect.arrayContaining(["--config", "--use-official-api", "--user-auth"]));
    expect(args).not.toContain("--client-id");
    expect(args).not.toContain("--client-secret");
    expect(args.join(" ")).not.toContain(SECRET);
  });

  it("passes no --config without credentials", () => {
    expect(buildSpotdlArgs({ ...base, clientId: "", clientSecret: "" }, true)).not.toContain("--config");
  });
});

describe("writeSpotdlConfig", () => {
  it("writes a private config with the credentials, and removes it when they're cleared", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "spotdl-home-"));
    const config = path.join(home, ".spotdl", "config.json");

    writeSpotdlConfig(home, "my-client-id", SECRET);
    expect(JSON.parse(fs.readFileSync(config, "utf8"))).toEqual({ client_id: "my-client-id", client_secret: SECRET });
    if (process.platform !== "win32") expect(fs.statSync(config).mode & 0o777).toBe(0o600);

    writeSpotdlConfig(home, "", "");
    expect(fs.existsSync(config)).toBe(false);
  });
});

describe.skipIf(process.platform === "win32")("runSpotdlDownload with the extension's own spotDL", () => {
  it("runs spotDL in the private home with the credentials in its config, not its arguments", async () => {
    const supportDir = fs.mkdtempSync(path.join(os.tmpdir(), "spotdl-support-"));
    const binary = path.join(supportDir, "spotdl");
    // A stand-in spotDL that reports what it was given, then fails so the output comes back.
    fs.writeFileSync(
      binary,
      '#!/bin/sh\necho "HOME=$HOME" >&2\necho "ARGS=$*" >&2\ncat "$HOME/.spotdl/config.json" >&2\nexit 1\n',
      { mode: 0o755 },
    );

    const error = await runSpotdlDownload(binary, { ...base, supportDir }, () => undefined).catch((e) => e);
    expect(error).toBeInstanceOf(SpotdlDownloadError);
    const output = (error as SpotdlDownloadError).rawOutput;
    expect(output).toContain(`HOME=${spotdlHome(supportDir)}`);
    expect(output).toContain("--config");
    expect(output.split("\n").find((l) => l.startsWith("ARGS="))).not.toContain(SECRET);
    expect(output).toContain(`"client_secret":"${SECRET}"`);
  });
});

describe.skipIf(process.platform === "win32")("runSpotdlDownload when the private home can't be prepared", () => {
  it("runs spotDL the old way but leaves the user's own spotDL token cache alone", async () => {
    const supportDir = fs.mkdtempSync(path.join(os.tmpdir(), "spotdl-support-"));
    const realHome = fs.mkdtempSync(path.join(os.tmpdir(), "spotdl-realhome-"));
    const binary = path.join(supportDir, "spotdl");
    fs.writeFileSync(binary, '#!/bin/sh\necho "HOME=$HOME" >&2\nexit 1\n', { mode: 0o755 });
    // A file where the private home's folder should go, so its config can't be written.
    fs.writeFileSync(spotdlHome(supportDir), "");
    const cache = path.join(realHome, ".spotdl", ".spotipy");
    fs.mkdirSync(path.dirname(cache), { recursive: true });
    fs.writeFileSync(cache, "{}");

    const savedHome = process.env.HOME;
    process.env.HOME = realHome;
    try {
      const error = await runSpotdlDownload(binary, { ...base, supportDir }, () => undefined).catch((e) => e);
      expect((error as SpotdlDownloadError).rawOutput).toContain(`HOME=${realHome}`);
      // The fingerprint lives in the private home, so a check against the real
      // home would find none and delete the user's cache.
      expect(fs.existsSync(cache)).toBe(true);
    } finally {
      process.env.HOME = savedHome;
    }
  });
});
