import { exec, ExecException } from "child_process";

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

const mask = (it: string, pattern: RegExp) => it.replace(pattern, "*".repeat(pattern.toString().length));

const execute = async (command: string, opts?: { maskPattern?: RegExp }) => {
  const PATH = "/usr/gnu/bin:/usr/local/bin:/bin:/usr/bin:.:/opt/homebrew/bin";
  const wrappedCommand = `zsh -l -c 'export PATH="$PATH:${PATH}" && ${command}'`;
  const maskPattern = opts?.maskPattern || new RegExp("");

  console.log(`Executing: ${wrappedCommand}`);
  const startTimestamp = Date.now();

  return new Promise<string>((res, rej) =>
    exec(wrappedCommand, (error: ExecException | null, stdout: string, stderr: string) => {
      const tookSeconds = (Date.now() - startTimestamp) / 1000;
      if (error) {
        console.error(`[${tookSeconds}s] Failed:\n${stderr}`);
        rej({
          ...error,
          message: mask(error.message, maskPattern),
        });
      }
      console.log(`[${tookSeconds}s] Success:\n${stdout}`);
      res(stdout.trim());
    })
  );
};

const formatCommand = (subcommand: string, args: { password: string; maskPattern?: RegExp }) => {
  const { password, maskPattern } = { maskPattern: new RegExp(""), ...args };
  const quote = password.includes('"') ? "'" : '"';
  const command = `echo ${quote}${password}${quote} | LPASS_DISABLE_PINENTRY=1 lpass ${subcommand}`;
  return mask(command, maskPattern);
};

export const lastPass = (email: string, password: string) => {
  const maskPattern = new RegExp(password);

  return {
    isLogged: () =>
      execute(formatCommand("status", { password, maskPattern }), {})
        .then((stdout) => stdout.includes(email))
        .catch(() => false),

    login: () => execute(formatCommand(`login ${email}`, { password, maskPattern }), { maskPattern }),

    // returns exit code > 0 if failed, so just need to convert return type to Promise<void>
    sync: () =>
      execute("sync").then(() => {
        /* noop */
      }),

    show: (id: string, opts: { sync: "auto" | "now" | "no" } = { sync: "auto" }): Promise<Account> =>
      execute(formatCommand(`show --sync=${opts.sync} --json ${id}`, { password, maskPattern }), { maskPattern }).then(
        (stdout) => serializeFromJson(stdout)[0]
      ),

    list: (opts: { sync: "auto" | "now" | "no" } = { sync: "auto" }) =>
      execute(
        formatCommand(`ls --sync=${opts.sync} --format="%ai<=>%an<=>%au<=>%ap<=>%al"`, { password, maskPattern }),
        { maskPattern }
      ).then((stdout) => {
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
      execute(
        formatCommand(`export --sync=${opts.sync} --fields=id,name,username,password,url`, { password, maskPattern }),
        { maskPattern }
      ).then((stdout) => {
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
