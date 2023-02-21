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

const execute = async (
  command: string,
  opts: { log: { stdout: boolean; stderr: boolean } } = { log: { stdout: false, stderr: false } }
) => {
  const PATH = "/usr/gnu/bin:/usr/local/bin:/bin:/usr/bin:.:/opt/homebrew/bin";
  const wrappedCommand = `zsh -l -c 'export PATH="$PATH:${PATH}" && ${command}'`;
  console.log(`Executing: ${wrappedCommand}`);
  return new Promise<string>((res, rej) =>
    exec(wrappedCommand, (error: ExecException | null, stdout: string, stderr: string) => {
      if (error) {
        if (opts.log.stderr) {
          console.error(`Failed: ${stderr}`);
        }
        rej(error);
      }
      if (opts.log.stdout) {
        console.log(`Success: ${stdout}`);
      }
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

  show: (id: string): Promise<Account> =>
    execute(`echo "${password}" | LPASS_DISABLE_PINENTRY=1 lpass show --json ${id}`).then(
      (stdout) => serializeFromJson(stdout)[0]
    ),

  list: (args: { sync: "auto" | "now" | "no" } = { sync: "auto" }) =>
    execute(
      `echo "${password}" | LPASS_DISABLE_PINENTRY=1 lpass export --sync=${args.sync} --fields=id,name,username,password,url`
    ).then((stdout) => {
      const items: { id: string; name: string; username: string; password: string; url: string }[] = stdout
        .split("\n")
        .filter((line) => line.trim() !== "")
        .slice(1)
        .map((line) => {
          const [id, name, username, password, url] = line.split(",");
          return { id, name, username, password, url };
        });
      return items;
    }),
});
