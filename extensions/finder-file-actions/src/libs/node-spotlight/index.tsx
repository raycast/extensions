import child from "child_process";
import split from "binary-split";
import map from "through2-map";

import attributes from "./attributes";

type Opts = {
  stdio: string[];
  signal?: AbortSignal | undefined;
};

interface IDictionary {
  [index: string]: string;
}

const spotlight = (
  query: string,
  dir: string | null = null,
  filter: string[] | null = null,
  attrs = [],
  abortable: React.MutableRefObject<AbortController | null | undefined> | undefined
) => {
  if (process.platform !== "darwin") throw new Error(process.platform + " is not supported.");
  if ("string" !== typeof query) throw new Error("query must be a string.");
  if (query.length === 0) throw new Error("query must not be empty.");
  if (dir && "string" !== typeof dir) throw new Error("dir must be a string.");

  const args = ["-0"];

  if (dir) {
    args.push("-onlyin", dir);
  }

  if (filter && filter.length) {
    const filterParts = ["-literal", filter.join(" && ")];
    args.push(...filterParts);
  }

  for (const attr of attrs) {
    args.push("-attr", attr);
  }

  const opts: Opts = {
    stdio: ["ignore", "pipe", "ignore"],
  };

  // make it abortable
  if (abortable) {
    opts.signal = abortable.current?.signal;
  }

  const search = child.spawn("mdfind", args, opts as object);

  const results = search.stdout.pipe(split("\0")).pipe(
    map.obj((row: Buffer) => {
      const data = row.toString("utf8").split(/\s+(?=kMD)/);
      const result: IDictionary = { path: data[0] };

      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];

        let value: string | null = data[i + 1];

        // strip attr prefix from value
        const begin = attr + " = ";

        if (value.slice(0, begin.length) === begin) {
          value = value.slice(begin.length);
        }

        // parse value
        if (value === "(null)") {
          value = null;
        } else if (attributes[attr] && typeof attributes[attr] === "function") {
          const f: (s: string) => string = attributes[attr];
          value = f(value);
        }

        if (value) {
          result[attr] = value;
        }
      }

      return result;
    })
  );

  search.on("error", (e) => {
    results.emit("error", e);
  });

  search.on("close", (status: number) => {
    if (status > 0) {
      results.emit("error", new Error("non-zero exit code"));
    }
  });

  return results;
};

export default spotlight;
