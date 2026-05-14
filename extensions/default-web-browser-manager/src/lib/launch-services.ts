import { execFile } from "node:child_process";

type BrowserInfo = {
  bundleId: string;
  name: string;
  path?: string;
};

export type BrowserListResult = {
  defaultBrowser: string | null;
  browsers: BrowserInfo[];
};

function runSwiftScript<T>(script: string, parser: (stdout: string) => T, args: string[] = []): Promise<T> {
  return new Promise((resolve, reject) => {
    // -suppress-warnings avoids noisy deprecation logs from LaunchServices APIs
    const child = execFile(
      "swift",
      ["-suppress-warnings", "-", ...args],
      { timeout: 10_000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        try {
          resolve(parser(stdout));
        } catch (parseError) {
          reject(parseError);
        }
      },
    );

    child.stdin?.write(script);
    child.stdin?.end();
  });
}

export async function getBrowsers(): Promise<BrowserListResult> {
  const script = `
import Foundation
import CoreServices

func appName(for bundleId: String) -> String {
  guard let urls = LSCopyApplicationURLsForBundleIdentifier(bundleId as CFString, nil)?.takeRetainedValue() as? [URL],
        let url = urls.first,
        let bundle = Bundle(url: url) else {
    return bundleId
  }
  if let displayName = bundle.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String {
    return displayName
  }
  if let name = bundle.object(forInfoDictionaryKey: "CFBundleName") as? String {
    return name
  }
  return url.deletingPathExtension().lastPathComponent
}

let scheme = "http" as CFString
let defaultHandler = LSCopyDefaultHandlerForURLScheme(scheme)?.takeRetainedValue() as String?
let handlers = LSCopyAllHandlersForURLScheme(scheme)?.takeRetainedValue() as? [String] ?? []

let payload: [[String: String]] = handlers.compactMap { bundleId in
  guard let urls = LSCopyApplicationURLsForBundleIdentifier(bundleId as CFString, nil)?.takeRetainedValue() as? [URL],
        let url = urls.first else {
    return [
      "bundleId": bundleId,
      "name": appName(for: bundleId),
    ]
  }
  return [
    "bundleId": bundleId,
    "name": appName(for: bundleId),
    "path": url.path,
  ]
}

let result: [String: Any] = [
  "default": defaultHandler as Any,
  "handlers": payload
]

let json = try! JSONSerialization.data(withJSONObject: result, options: [])
print(String(data: json, encoding: .utf8)!)
`;

  return runSwiftScript(script, (stdout) => {
    const data = JSON.parse(stdout);
    const browsers: BrowserInfo[] =
      (data.handlers as BrowserInfo[] | undefined)?.filter(Boolean).map((entry) => ({
        ...entry,
        path: entry.path ?? undefined,
      })) ?? [];
    return {
      defaultBrowser: (data.default as string | null) ?? null,
      browsers,
    };
  });
}

export async function setDefaultBrowser(bundleId: string): Promise<void> {
  const script = `
import Foundation
import CoreServices

let bundleId = CommandLine.arguments[1]
let scheme = "http" as CFString
let status = LSSetDefaultHandlerForURLScheme(scheme, bundleId as CFString)
if status != noErr {
  fputs("Failed with status: \\(status)\\n", stderr)
  exit(1)
}
`;

  await runSwiftScript(`${script}`, () => undefined, [bundleId]);
}
