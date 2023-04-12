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

const execute = async (command: string, opts: { log: { stdout: boolean } } = { log: { stdout: false } }) => {
  const PATH = "/usr/gnu/bin:/usr/local/bin:/bin:/usr/bin:.:/opt/homebrew/bin";
  const wrappedCommand = `zsh -l -c 'export PATH="$PATH:${PATH}" && ${command}'`;
  console.log(`Executing: ${wrappedCommand}`);
  const startTimestamp = Date.now();
  return new Promise<string>((res, rej) =>
    exec(wrappedCommand, (error: ExecException | null, stdout: string, stderr: string) => {
      const endTimestamp = Date.now();
      const tookSeconds = (endTimestamp - startTimestamp) / 1000;
      if (error) {
        console.error(`[${tookSeconds}s] Failed:\n${stderr}`);
        rej(error);
      }
      console.log(`[${tookSeconds}s] Success${opts.log.stdout ? `:\n${stdout}` : ""}`);
      res(stdout.trim());
    })
  );
};

export const lastPass = (email: string, password: string) => ({
  isLogged: () =>
    execute("lpass status")
      .then((stdout) => stdout.includes(email))
      .catch(() => false),

  login: () => execute(`echo "${password}" | LPASS_DISABLE_PINENTRY=1 lpass login ${email}`),

  // returns exit code > 0 if failed, so just need to convert return type to Promise<void>
  sync: () =>
    execute("lpass sync").then(() => {
      /* noop */
    }),

  show: (id: string, opts: { sync: "auto" | "now" | "no" } = { sync: "auto" }): Promise<Account> =>
    execute(`echo "${password}" | LPASS_DISABLE_PINENTRY=1 lpass show --sync=${opts.sync} --json ${id}`).then(
      (stdout) => serializeFromJson(stdout)[0]
    ),

  list: (opts: { sync: "auto" | "now" | "no" } = { sync: "auto" }) =>
    execute(
      `echo "${password}" | LPASS_DISABLE_PINENTRY=1 lpass ls --sync=${opts.sync} --format="%ai<=>%an<=>%au<=>%ap<=>%al"`
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
      `echo "${password}" | LPASS_DISABLE_PINENTRY=1 lpass export --sync=${opts.sync} --fields=id,name,username,password,url`
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
});
