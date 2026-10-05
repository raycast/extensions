import { spawn } from "child_process";

export type Account = {
  name: string;
  id: string;
  username: string;
  password: string;
  url: string;
  lastModified: Date;
  lastTouch: Date;
  fullname: string;
  group: string;
  note?: string;
};

const serializeFromJson = (jsonArray: string): Account[] => {
  const array: any[] = JSON.parse(jsonArray);
  const res = array.map(
    (obj) =>
      ({
        ...obj,
        lastModified: new Date(parseInt(obj.last_modified_gmt, 10) * 1000),
        lastTouch: new Date(parseInt(obj.last_touch, 10) * 1000),
      } as Account)
  );
  return res;
};

// Directories `lpass` is commonly installed into, appended to whatever PATH the
// user's login shell already provides.
const EXTRA_PATH = "/usr/gnu/bin:/usr/local/bin:/bin:/usr/bin:.:/opt/homebrew/bin";

// `lpass` still runs through a login shell so the user's own PATH applies, but its
// arguments are handed over as positional parameters instead of being interpolated
// into the script, so the shell never re-parses them. The master password goes to
// stdin rather than into the command line, which keeps it out of the process list.
const execute = async (args: string[], password: string) => {
  const script = `export PATH="$PATH:${EXTRA_PATH}" && exec lpass "$@"`;
  const subcommand = args[0];

  console.log(`Executing: lpass ${subcommand}`);
  const startTimestamp = Date.now();

  return new Promise<string>((res, rej) => {
    const child = spawn("zsh", ["-l", "-c", script, "lpass", ...args], {
      env: { ...process.env, LPASS_DISABLE_PINENTRY: "1" },
    });

    // Collected by hand rather than through `exec`, so there is no output size cap
    // to outgrow on large vaults.
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));

    // `lpass` only reads stdin when it actually has to unlock the vault; otherwise
    // the pipe is closed underneath us and writing to it raises EPIPE.
    child.stdin.on("error", () => undefined);
    child.stdin.end(`${password}\n`);

    const elapsedSeconds = () => (Date.now() - startTimestamp) / 1000;

    child.on("error", (error) => {
      console.error(`[${elapsedSeconds()}s] Failed to spawn: lpass ${subcommand}`);
      rej(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.error(`[${elapsedSeconds()}s] Failed: lpass ${subcommand}\n${stderr}`);
        rej(new Error(stderr.trim() || `lpass ${subcommand} exited with code ${code}`));
        return;
      }
      // Deliberately logs no output — for most subcommands it is the vault itself.
      console.log(`[${elapsedSeconds()}s] Success: lpass ${subcommand}`);
      res(stdout.trim());
    });
  });
};

export const lastPass = (email: string, password: string) => {
  return {
    isLogged: () =>
      execute(["status"], password)
        .then((stdout) => stdout.includes(email))
        .catch(() => false),

    login: () => execute(["login", email], password),

    show: (id: string, opts: { sync: "auto" | "now" | "no" } = { sync: "auto" }): Promise<Account> =>
      execute(["show", `--sync=${opts.sync}`, "--json", id], password).then((stdout) => serializeFromJson(stdout)[0]),

    list: (opts: { sync: "auto" | "now" | "no" } = { sync: "auto" }) =>
      execute(["ls", `--sync=${opts.sync}`, "--format=%ai<=>%an<=>%au<=>%ap<=>%al"], password).then((stdout) => {
        const items: { id: string; name: string; username: string; password: string; url: string }[] = stdout
          .split("\n")
          .map((line) => {
            const [id, name, username, password, url] = line.split("<=>");
            return { id, name, username, password, url };
          })
          .filter(({ name }) => name);
        return items;
      }),

    export: (opts: { sync: "auto" | "now" | "no" } = { sync: "auto" }) =>
      execute(["export", `--sync=${opts.sync}`, "--fields=id,name,username,password,url"], password).then((stdout) => {
        const items: { id: string; name: string; username: string; password: string; url: string }[] = stdout
          .split("\n")
          .filter((line) => line.trim() !== "")
          .slice(1)
          .map((line) => {
            const [id, name, username, password, url] = line.split(",");
            return { id, name, username, password, url };
          })
          .filter(({ name }) => name);
        return items;
      }),
  };
};
