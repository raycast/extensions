export const SYS_ID_RE = /^[0-9a-f]{32}$/i;
export const TABLE_NAME_RE = /^[a-z][a-z0-9_]*$/i;

function isValid(table: string | undefined, sysId: string | undefined): { table: string; sysId: string } | null {
  if (!table || !sysId) return null;
  if (!TABLE_NAME_RE.test(table) || !SYS_ID_RE.test(sysId)) return null;
  return { table, sysId };
}

function fromDoPathAndQuery(path: string, params: URLSearchParams): { table: string; sysId: string } | null {
  const match = path.match(/(?:^|\/)([a-z][a-z0-9_]*)\.do$/i);
  if (!match) return null;
  return isValid(match[1], params.get("sys_id") ?? undefined);
}

export function extractRecordFromUrl(url: string): { table: string; sysId: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const pathname = parsed.pathname;

  // SOW KB view: /now/sow/kb_view/kb_knowledge/<sysId>
  const kb = pathname.match(/\/now\/sow\/kb_view\/kb_knowledge\/([0-9a-f]{32})\b/i);
  if (kb) return isValid("kb_knowledge", kb[1]);

  // SOW record: /now/sow/record/<table>/<sysId>
  const sow = pathname.match(/\/now\/sow\/record\/([a-z][a-z0-9_]*)\/([0-9a-f]{32})\b/i);
  if (sow) return isValid(sow[1], sow[2]);

  // Classic UI wrapper: /now/nav/ui/classic/params/target/<encoded target>
  const classic = pathname.match(/\/now\/nav\/ui\/classic\/params\/target\/(.+)$/i);
  if (classic) {
    try {
      const target = decodeURIComponent(classic[1]);
      const [targetPath, targetQuery = ""] = target.split("?");
      return fromDoPathAndQuery(targetPath, new URLSearchParams(targetQuery));
    } catch {
      return null;
    }
  }

  // nav_to.do?uri=<table>.do?sys_id=<sysId>
  if (pathname.endsWith("/nav_to.do") || pathname === "/nav_to.do") {
    const uri = parsed.searchParams.get("uri");
    if (!uri) return null;
    const [uriPath, uriQuery = ""] = uri.split("?");
    return fromDoPathAndQuery(uriPath, new URLSearchParams(uriQuery));
  }

  // Direct: /<table>.do?sys_id=<sysId>
  return fromDoPathAndQuery(pathname, parsed.searchParams);
}
