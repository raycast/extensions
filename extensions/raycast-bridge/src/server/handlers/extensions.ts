import http from "http";
import fs from "fs";
import path from "path";
import { ok, fail } from "../../utils/response";

const EXTENSIONS_DIR = path.join(
  process.env.RAYCAST_EXTENSIONS_DIR ||
    path.join(process.env.HOME || "~", ".config", "raycast", "extensions"),
);

interface ExtensionCommand {
  name: string;
  title: string;
  description: string;
  mode: string;
}

interface ExtensionInfo {
  name: string;
  title: string;
  author: string;
  description: string;
  commands: ExtensionCommand[];
}

function listInstalledExtensions(filter?: string): ExtensionInfo[] {
  const results: ExtensionInfo[] = [];
  try {
    const dirs = fs.readdirSync(EXTENSIONS_DIR);
    for (const dir of dirs) {
      const pkgPath = path.join(EXTENSIONS_DIR, dir, "package.json");
      try {
        const raw = fs.readFileSync(pkgPath, "utf-8");
        const pkg = JSON.parse(raw);
        if (!pkg.name || !pkg.author) continue;
        if (filter && pkg.name !== filter && pkg.author !== filter) continue;

        const commands: ExtensionCommand[] = (pkg.commands || []).map(
          (c: {
            name: string;
            title: string;
            description?: string;
            mode?: string;
          }) => ({
            name: c.name,
            title: c.title,
            description: c.description || "",
            mode: c.mode || "view",
          }),
        );

        results.push({
          name: pkg.name,
          title: pkg.title || pkg.name,
          author: pkg.author,
          description: pkg.description || "",
          commands,
        });
      } catch {
        // skip dirs without valid package.json
      }
    }
  } catch {
    // extensions dir doesn't exist
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export function handleListExtensions(
  req: http.IncomingMessage,
  res: http.ServerResponse,
) {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const filter = url.searchParams.get("name") || undefined;
  const extensions = listInstalledExtensions(filter);
  ok(res, { count: extensions.length, extensions });
}

export function handleGetExtension(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  author: string,
  name: string,
) {
  const all = listInstalledExtensions();
  const ext = all.find((e) => e.author === author && e.name === name);
  if (ext) {
    ok(res, ext);
  } else {
    fail(
      res,
      404,
      "EXTENSION_NOT_FOUND",
      `Extension ${author}/${name} not found`,
      "Use GET /extensions to list all installed extensions",
    );
  }
}
