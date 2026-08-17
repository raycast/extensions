import { describe, expect, it } from "vitest";
import { cleaner, cfg, transformIfCommand } from "./helpers";

describe("command detection", () => {
  it("detects a multi-line command", () => {
    expect(transformIfCommand("echo hi\nls -la\n", { aggressiveness: "normal" })).toBe("echo hi ls -la");
  });

  it("skips a single line", () => {
    expect(transformIfCommand("ls -la", { aggressiveness: "normal" })).toBeNull();
  });

  it("skips long copies", () => {
    const blob = Array.from({ length: 11 }, () => "echo hi").join("\n");
    expect(transformIfCommand(blob, { aggressiveness: "normal" })).toBeNull();
  });

  it("leaves structured JSON alone", () => {
    const json = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::bucket-in-account-a",
        "arn:aws:s3:::bucket-in-account-a/*"
      ]
    }
  ]
}`;
    expect(transformIfCommand(json, { aggressiveness: "normal" })).toBeNull();
  });

  it("preserves blank lines when enabled", () => {
    expect(transformIfCommand("echo hi\n\necho bye\n", { aggressiveness: "normal", preserveBlankLines: true })).toBe(
      "echo hi\n\necho bye",
    );
  });

  it("flattens backslash continuations", () => {
    const text = `python script.py \\
  --flag yes \\
  --count 2`;
    expect(transformIfCommand(text, { aggressiveness: "normal" })).toBe("python script.py --flag yes --count 2");
  });

  it("flattens indented continuation arguments", () => {
    const text = `gog auth add
    steipete@gmail.com --services all --force-consent`;
    expect(transformIfCommand(text, { aggressiveness: "normal" })).toBe(
      "gog auth add steipete@gmail.com --services all --force-consent",
    );
  });

  it("repairs all-caps token breaks", () => {
    expect(transformIfCommand("N\nODE_PATH=/usr/bin\nls", { aggressiveness: "normal" })).toBe("NODE_PATH=/usr/bin ls");
  });

  it("preserves space before flags after line wrap", () => {
    const text = `go run ./cmd/metcli instagram feed sportg33k --inline --grid-cols 4 --thumb-cols 12
--page-grid-size 40`;
    expect(transformIfCommand(text, { aggressiveness: "normal" })).toBe(
      "go run ./cmd/metcli instagram feed sportg33k --inline --grid-cols 4 --thumb-cols 12 --page-grid-size 40",
    );
  });

  it("joins hyphen-wrapped segments", () => {
    const text = `open src/statics/qrcode/scan-qr-f1cc4328-eb1d-4a3c-9bd2-
  f1a4ccda5f6a.png`;
    expect(transformIfCommand(text, { aggressiveness: "normal" })).toBe(
      "open src/statics/qrcode/scan-qr-f1cc4328-eb1d-4a3c-9bd2-f1a4ccda5f6a.png",
    );
  });

  it("does not merge list bullets even at high", () => {
    expect(transformIfCommand("- item one\n- item two", { aggressiveness: "high" })).toBeNull();
  });

  it("collapses blank lines when not preserved", () => {
    expect(transformIfCommand("echo a\n\necho b", { aggressiveness: "high", preserveBlankLines: false })).toBe(
      "echo a echo b",
    );
  });

  it("ignores harmless multiline text at low", () => {
    expect(transformIfCommand("Shopping list:\napples\noranges", { aggressiveness: "low" })).toBeNull();
  });

  it("keeps pyenv init multiline at normal and flattens at high override", () => {
    const text = `export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init - zsh)"`;
    expect(transformIfCommand(text, { aggressiveness: "normal" })).toBeNull();
    const forced = transformIfCommand(text, { aggressiveness: "normal" }, "high");
    expect(forced).not.toBeNull();
    expect(forced?.includes("\n")).toBe(false);
  });

  it("needs clear signals at low aggressiveness", () => {
    expect(transformIfCommand("echo hello\nworld", { aggressiveness: "low" })).toBeNull();
  });

  it("flattens loose commands at high", () => {
    expect(transformIfCommand("npm\ninstall", { aggressiveness: "high" })).toBe("npm install");
  });

  it.each(["low", "normal", "high"] as const)("flattens an explicit continuation at %s", (level) => {
    expect(transformIfCommand("echo hi \\\n--flag yes", { aggressiveness: level })).toBe("echo hi --flag yes");
  });

  it("keeps non-commands at normal", () => {
    expect(transformIfCommand("Meeting notes:\nbullet\nitems", { aggressiveness: "normal" })).toBeNull();
  });

  it("skips plain id lists at normal", () => {
    const ids = `3c43356531
0c25477230
5837bc2cbe
4006d4714a
014b008f6a`;
    expect(transformIfCommand(ids, { aggressiveness: "normal" })).toBeNull();
  });

  it("skips longer multiline snippets at normal and flattens with high override", () => {
    const text = 'curl https://example.com \\\n  -H "a: b" \\\n  -H "c: d" \\\n  -H "e: f" \\\n  -H "g: h"';
    expect(transformIfCommand(text, { aggressiveness: "normal" })).toBeNull();
    const forced = transformIfCommand(text, { aggressiveness: "normal" }, "high");
    expect(forced).not.toBeNull();
    expect(forced?.includes("\n")).toBe(false);
  });

  it("does not flatten a Swift snippet at normal", () => {
    const swiftSnippet = `// MARK: Shape

public extension Shape where Self == AnyShape {
    static var roundedContainer: some Shape {
        AnyShape(
            .squircle(cornerRadius: .roundedCornerRadius)
        )
    }
}`;
    expect(transformIfCommand(swiftSnippet, { aggressiveness: "normal" })).toBeNull();
    const forced = transformIfCommand(swiftSnippet, { aggressiveness: "normal" }, "high");
    expect(forced).not.toBeNull();
    expect(forced?.includes("AnyShape")).toBe(true);
    expect(forced).not.toBe(swiftSnippet);
  });

  it("skips code at low but allows a high override", () => {
    const code = `extension Foo {
    func bar() {
        print("hi")
    }
}`;
    expect(transformIfCommand(code, { aggressiveness: "low" })).toBeNull();
    const forced = transformIfCommand(code, { aggressiveness: "low" }, "high");
    expect(forced).not.toBeNull();
    expect(forced?.includes("\n")).toBe(false);
  });

  it("skips a struct definition at normal", () => {
    const code = `struct Widget {
    let radius: Double
    var color: String
}`;
    expect(transformIfCommand(code, { aggressiveness: "normal" })).toBeNull();
  });

  it("flattens a struct definition with a high override", () => {
    const code = `struct Gadget {
    let id: UUID
    func render() { print(id) }
}`;
    const forced = transformIfCommand(code, { aggressiveness: "low" }, "high");
    expect(forced).not.toBeNull();
    expect(forced?.includes("\n")).toBe(false);
  });

  it("round-trips preserve-blank-lines with a continuation", () => {
    const text = `echo a \\
--flag yes

echo b`;
    expect(transformIfCommand(text, { aggressiveness: "high", preserveBlankLines: true })).toBe(
      "echo a --flag yes\n\necho b",
    );
  });

  it("flattens a backslash-wrapped non-command at low because of the continuation", () => {
    const text = `Not really a command \\
just text`;
    expect(transformIfCommand(text, { aggressiveness: "low" })).toBe("Not really a command just text");
    expect(transformIfCommand(text, { aggressiveness: "high" })).toBe("Not really a command just text");
  });
});

describe("wrapped URLs", () => {
  it("strips internal whitespace from a wrapped URL", () => {
    expect(cleaner().repairWrappedURL("https://example.com/some-\n path?foo=1&bar= two")).toBe(
      "https://example.com/some-path?foo=1&bar=two",
    );
  });

  it("is a no-op when the URL is already tight", () => {
    expect(cleaner().repairWrappedURL("https://example.com/already-clean?x=1")).toBeNull();
  });

  it("rejects multiple schemes", () => {
    expect(cleaner().repairWrappedURL("https://one.com http://two.com")).toBeNull();
  });

  it("rejects text with no scheme", () => {
    expect(cleaner().repairWrappedURL("example.com/foo bar")).toBeNull();
  });
});

describe("prompt prefixes", () => {
  it("strips a prompt from a single-line command", () => {
    expect(cleaner().stripPromptPrefixes("# some-cli hello")).toBe("some-cli hello");
  });

  it("does not strip a markdown heading", () => {
    expect(cleaner().stripPromptPrefixes("# Release Notes")).toBeNull();
  });

  it("strips a prompt across a majority of lines", () => {
    expect(cleaner().stripPromptPrefixes("# brew install foo\n# brew install bar\nnotes stay")).toBe(
      "brew install foo\nbrew install bar\nnotes stay",
    );
  });

  it("does not strip when only one line looks like a heading", () => {
    expect(cleaner().stripPromptPrefixes("# Release notes\nbrew install foo")).toBeNull();
  });
});

describe("path quoting", () => {
  it("quotes an absolute path with spaces", () => {
    expect(cleaner().quotePathWithSpaces("/Users/anton/My Documents/project")).toBe(
      '"/Users/anton/My Documents/project"',
    );
  });

  it("quotes a home-relative path with spaces", () => {
    expect(cleaner().quotePathWithSpaces("~/Library/Application Support/SomeApp")).toBe(
      '"~/Library/Application Support/SomeApp"',
    );
  });

  it("quotes a current-dir relative path with spaces", () => {
    expect(cleaner().quotePathWithSpaces("./My Project/src")).toBe('"./My Project/src"');
  });

  it("quotes a parent-dir relative path with spaces", () => {
    expect(cleaner().quotePathWithSpaces("../Other Project/lib")).toBe('"../Other Project/lib"');
  });

  it("does not quote a path without spaces", () => {
    expect(cleaner().quotePathWithSpaces("/Users/anton/Documents/project")).toBeNull();
  });

  it("does not quote an already double-quoted path", () => {
    expect(cleaner().quotePathWithSpaces('"/Users/anton/My Documents/project"')).toBeNull();
  });

  it("does not quote an already single-quoted path", () => {
    expect(cleaner().quotePathWithSpaces("'/Users/anton/My Documents/project'")).toBeNull();
  });

  it("does not quote multi-line paths", () => {
    expect(cleaner().quotePathWithSpaces("/Users/anton/My Documents\n/another/path")).toBeNull();
  });

  it("does not quote a command with flags", () => {
    expect(cleaner().quotePathWithSpaces("/usr/bin/ls -la /some/path")).toBeNull();
  });

  it("does not quote a command with a path argument", () => {
    expect(cleaner().quotePathWithSpaces("cd /Users/anton/My Documents")).toBeNull();
  });

  it("does not quote open with a path argument", () => {
    expect(cleaner().quotePathWithSpaces("open /Users/anton/My Documents")).toBeNull();
  });

  it("does not quote a sentence containing a path", () => {
    expect(cleaner().quotePathWithSpaces("See /Users/anton/My Documents for details")).toBeNull();
  });

  it("does not quote non-path text", () => {
    expect(cleaner().quotePathWithSpaces("just some text with spaces")).toBeNull();
  });

  it("escapes existing double quotes in a path", () => {
    expect(cleaner().quotePathWithSpaces('/Users/anton/My "Special" Folder')).toBe(
      '"/Users/anton/My \\"Special\\" Folder"',
    );
  });

  it("trims whitespace before quoting", () => {
    expect(cleaner().quotePathWithSpaces("  /Users/anton/My Documents/project  \n")).toBe(
      '"/Users/anton/My Documents/project"',
    );
  });

  it("quotes a relative path with spaces", () => {
    expect(cleaner().quotePathWithSpaces("designcode.io/SwiftUI for iOS 17/Xcode Final/iOS17")).toBe(
      '"designcode.io/SwiftUI for iOS 17/Xcode Final/iOS17"',
    );
  });

  it("does not quote URLs", () => {
    expect(cleaner().quotePathWithSpaces("https://example.com/path with spaces")).toBeNull();
  });
});

describe("pipeline", () => {
  it("does not run paragraph dedent before command flattening", () => {
    const result = cleaner().transform("echo hello \\\n  && echo world", cfg({ aggressiveness: "normal" }));
    expect(result.trimmed).toBe("echo hello && echo world");
  });
});
