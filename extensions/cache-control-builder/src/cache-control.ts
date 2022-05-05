import { environment } from "@raycast/api";
import { readFile } from "fs/promises";
import { join as joinPath } from "path";

export type Directive =
  | { "max-age": number }
  | { "s-maxage": number }
  | "no-cache"
  | "no-store"
  | "no-transform"
  | "must-revalidate"
  | "proxy-revalidate"
  | "must-understand"
  | "private"
  | "public"
  | "immutable"
  | { "stale-while-revalidate": number }
  | { "stale-if-error": number };

export type Directives = Array<Directive>;

export function sort(directives: Directives): Directives {
  directives.sort((a, b) => order(a) - order(b));
  return directives;
}

export function stringify(directives: Directives, withSpace?: boolean): string {
  sort(directives);

  return directives
    .map((d) => {
      if (typeof d === "object") {
        if ("max-age" in d) {
          return `max-age=${d["max-age"]}`;
        } else if ("s-maxage" in d) {
          return `s-maxage=${d["s-maxage"]}`;
        } else if ("stale-while-revalidate" in d) {
          return `stale-while-revalidate=${d["stale-while-revalidate"]}`;
        } else if ("stale-if-error" in d) {
          return `stale-if-error=${d["stale-if-error"]}`;
        }
      } else {
        return d;
      }
    })
    .join(withSpace ? ", " : ",");
}

function order(directive: Directive): number {
  if (typeof directive === "object") {
    if ("max-age" in directive) {
      return 4;
    } else if ("s-maxage" in directive) {
      return 5;
    } else if ("stale-while-revalidate" in directive) {
      return 6;
    } else if ("stale-if-error" in directive) {
      return 7;
    }
  } else {
    switch (directive) {
      case "private":
        return 1;
      case "public":
        return 2;
      case "no-cache":
        return 3;
      case "immutable":
        return 8;
      case "must-revalidate":
        return 9;
      case "proxy-revalidate":
        return 10;
      case "no-transform":
        return 11;
      case "must-understand":
        return 12;
      case "no-store":
        return 13;
    }
  }

  return Number.MAX_VALUE;
}

export function title(directive: Directive): string {
  if (typeof directive === "object") {
    if ("max-age" in directive) {
      return "max-age=N";
    } else if ("s-maxage" in directive) {
      return "s-maxage=N";
    } else if ("stale-while-revalidate" in directive) {
      return "stale-while-revalidate=N";
    } else if ("stale-if-error" in directive) {
      return "stale-if-error=N";
    }
  }
  return directive;
}

export function description(directive: Directive): string | undefined {
  if (typeof directive === "object") {
    if ("max-age" in directive) {
      return undefined;
    } else if ("s-maxage" in directive) {
      return "duration the response remains fresh - specific for shared caches";
    } else if ("stale-while-revalidate" in directive) {
      return "reuse stale response while cache is revalidated";
    } else if ("stale-if-error" in directive) {
      return "reuse stale responses when an origin responds with an error";
    }
  } else {
    switch (directive) {
      case "no-cache":
        return undefined;
      case "no-store":
        return undefined;
      case "no-transform":
        return "intermediaries shouldn't transform the response contents";
      case "must-revalidate":
        return "must revalidate before reusing cache";
      case "proxy-revalidate":
        return "shared caches (e.g. Proxies) revalidate before reusing cache";
      case "must-understand":
        return "only store cache if requirements for caching based on status code is understood";
      case "private":
        return undefined;
      case "public":
        return undefined;
      case "immutable":
        return "revalidation not necessary (use e.g. for resources with hashed URLs)";
    }
  }

  return undefined;
}

export async function loadDocs(directive: Directive): Promise<string | null> {
  if (typeof directive === "object") {
    if ("max-age" in directive) {
      return await readFile(joinPath(environment.assetsPath, "docs/max-age.md"), { encoding: "utf-8" });
    } else if ("s-maxage" in directive) {
      return await readFile(joinPath(environment.assetsPath, "docs/s-maxage.md"), { encoding: "utf-8" });
    } else if ("stale-while-revalidate" in directive) {
      return await readFile(joinPath(environment.assetsPath, "docs/stale-while-revalidate.md"), { encoding: "utf-8" });
    } else if ("stale-if-error" in directive) {
      return await readFile(joinPath(environment.assetsPath, "docs/stale-if-error.md"), { encoding: "utf-8" });
    }
  } else {
    switch (directive) {
      case "no-cache":
        return await readFile(joinPath(environment.assetsPath, "docs/no-cache.md"), { encoding: "utf-8" });
      case "no-store":
        return await readFile(joinPath(environment.assetsPath, "docs/no-store.md"), { encoding: "utf-8" });
      case "no-transform":
        return await readFile(joinPath(environment.assetsPath, "docs/no-transform.md"), { encoding: "utf-8" });
      case "must-revalidate":
        return await readFile(joinPath(environment.assetsPath, "docs/must-revalidate.md"), { encoding: "utf-8" });
      case "proxy-revalidate":
        return await readFile(joinPath(environment.assetsPath, "docs/proxy-revalidate.md"), { encoding: "utf-8" });
      case "must-understand":
        return await readFile(joinPath(environment.assetsPath, "docs/must-understand.md"), { encoding: "utf-8" });
      case "private":
        return await readFile(joinPath(environment.assetsPath, "docs/private.md"), { encoding: "utf-8" });
      case "public":
        return await readFile(joinPath(environment.assetsPath, "docs/public.md"), { encoding: "utf-8" });
      case "immutable":
        return await readFile(joinPath(environment.assetsPath, "docs/immutable.md"), { encoding: "utf-8" });
    }
  }

  return null;
}
