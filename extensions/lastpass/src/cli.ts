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

const execute = async (command: string) => {
  const PATH = "/usr/gnu/bin:/usr/local/bin:/bin:/usr/bin:.:/opt/homebrew/bin";
  const wrappedCommand = `zsh -l -c 'export PATH="$PATH:${PATH}" && ${command}'`;

  console.log(`Executing: ${wrappedCommand}`);
  const startTimestamp = Date.now();

  return new Promise<string>((res, rej) =>
    exec(
      wrappedCommand,
      { maxBuffer: 4 * 1024 * 1024 }, // 4 times bigger stdout buffer size for large sets of credentials
      (error: ExecException | null, stdout: string, stderr: string) => {
        const tookSeconds = (Date.now() - startTimestamp) / 1000;
        if (error) {
          console.error(`[${tookSeconds}s] Failed:\n${stderr}`);
          rej({
            ...error,
            message: error.message,
          });
        }
        console.log(`[${tookSeconds}s] Success:\n${stdout}`);
        res(stdout.trim());
      }
    )
  );
};

const authorize = (subcommand: string, opts: { password: string }) => {
  const { password } = opts;
  const quote = password?.includes('"') ? "'" : '"';
  const maskedCommand = `echo ${quote}${password}${quote} | LPASS_DISABLE_PINENTRY=1 lpass ${subcommand}`;
  return maskedCommand;
};

export const lastPass = (email: string, password: string) => {
  return {
    isLogged: () =>
      execute(authorize("status", { password }))
        .then((stdout) => stdout.includes(email))
        .catch(() => false),

    login: () => execute(authorize(`login ${email}`, { password })),

    show: (id: string, opts: { sync: "auto" | "now" | "no" } = { sync: "auto" }): Promise<Account> =>
      execute(authorize(`show --sync=${opts.sync} --json ${id}`, { password })).then(
        (stdout) => serializeFromJson(stdout)[0]
      ),

    list: (opts: { sync: "auto" | "now" | "no" } = { sync: "auto" }) =>
      execute(authorize(`ls --sync=${opts.sync} --format="%ai<=>%an<=>%au<=>%ap<=>%al"`, { password })).then(
        (stdout) => {
          const items: { id: string; name: string; username: string; password: string; url: string }[] = stdout
            .split("\n")
            .map((line) => {
              const [id, name, username, password, url] = line.split("<=>");
              return { id, name, username, password, url };
            })
            .filter(({ name }) => name);
          return items;
        }
      ),

    export: (opts: { sync: "auto" | "now" | "no" } = { sync: "auto" }) =>
      execute(
        authorize(`export --sync=${opts.sync} --fields=id,name,username,password,url`, {
          password,
        })
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
