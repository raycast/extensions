import { describe, expect, it } from "vitest";
import { addGlobally, upgrade } from "../mise/operations";
import { miseCommandLine, shellCommandFor, shellQuote, terminalLaunches } from "./script";

const ZSH = "/bin/zsh";
const LOCATION = { path: "/Users/lachlan/.local/bin/mise" };

describe("shellQuote", () => {
  it("leaves bare words alone and single-quotes everything else", () => {
    expect(shellQuote("jq@latest")).toBe("jq@latest");
    expect(shellQuote("/Users/me/.config/mise/conf.d/tools.toml")).toBe("/Users/me/.config/mise/conf.d/tools.toml");
    expect(shellQuote("a b")).toBe("'a b'");
    expect(shellQuote("$HOME")).toBe("'$HOME'");
    expect(shellQuote("")).toBe("''");
  });

  it("escapes a single quote by closing, escaping and reopening", () => {
    expect(shellQuote("it's")).toBe("'it'\\''s'");
  });
});

describe("miseCommandLine", () => {
  it("joins the mise path and the operation's args, quoting only what needs it", () => {
    expect(miseCommandLine(LOCATION, addGlobally("jq"))).toBe("/Users/lachlan/.local/bin/mise use -g jq@latest");
    expect(miseCommandLine(LOCATION, upgrade("jq", { jobs: 4 }))).toBe(
      "/Users/lachlan/.local/bin/mise upgrade -j 4 jq",
    );
    expect(miseCommandLine({ path: "/Users/me/my mise/mise" }, addGlobally("jq"))).toBe(
      "'/Users/me/my mise/mise' use -g jq@latest",
    );
  });
});

describe("shellCommandFor", () => {
  it("runs the command in a login shell and keeps the window open with another one", () => {
    expect(shellCommandFor("mise run build", ZSH)).toBe("/bin/zsh -il -c 'mise run build; exec /bin/zsh -l'");
  });

  it("escapes single quotes inside the command", () => {
    expect(shellCommandFor("echo 'hi there'", ZSH)).toBe("/bin/zsh -il -c 'echo '\\''hi there'\\''; exec /bin/zsh -l'");
  });
});

describe("terminalLaunches", () => {
  const command = "/Users/lachlan/.local/bin/mise use -g jq@latest";

  it("opens a Ghostty window through AppleScript, with open -na as the fallback", () => {
    expect(terminalLaunches("com.mitchellh.ghostty", command, ZSH)).toEqual([
      {
        kind: "applescript",
        source: [
          'tell application "Ghostty"',
          `  new window with configuration {command:"/bin/zsh -il -c '${command}; exec /bin/zsh -l'"}`,
          "  activate",
          "end tell",
        ].join("\n"),
      },
      {
        kind: "open",
        args: ["-na", "Ghostty.app", "--args", "-e", ZSH, "-il", "-c", `${command}; exec /bin/zsh -l`],
      },
    ]);
  });

  it("creates an iTerm window running the login-shell wrapper", () => {
    expect(terminalLaunches("com.googlecode.iterm2", command, ZSH)).toEqual([
      {
        kind: "applescript",
        source: [
          'tell application "iTerm"',
          `  create window with default profile command "/bin/zsh -il -c '${command}; exec /bin/zsh -l'"`,
          "  activate",
          "end tell",
        ].join("\n"),
      },
    ]);
  });

  it("hands Terminal.app the bare command, since do script already runs the user's shell", () => {
    const expected = [
      {
        kind: "applescript",
        source: ['tell application "Terminal"', `  do script "${command}"`, "  activate", "end tell"].join("\n"),
      },
    ];
    expect(terminalLaunches("com.apple.Terminal", command, ZSH)).toEqual(expected);
    expect(terminalLaunches(undefined, command, ZSH)).toEqual(expected);
    expect(terminalLaunches("com.example.unknown", command, ZSH)).toEqual(expected);
  });

  it("escapes backslashes and double quotes for AppleScript after shell-quoting", () => {
    const [ghostty] = terminalLaunches("com.mitchellh.ghostty", `echo "it's" \\n`, ZSH);
    expect(ghostty).toMatchObject({
      source: expect.stringContaining(`{command:"/bin/zsh -il -c 'echo \\"it'\\\\''s\\" \\\\n; exec /bin/zsh -l'"}`),
    });
    const [terminal] = terminalLaunches("com.apple.Terminal", `echo "a\\b"`, ZSH);
    expect(terminal).toMatchObject({ source: expect.stringContaining(`do script "echo \\"a\\\\b\\""`) });
  });
});
