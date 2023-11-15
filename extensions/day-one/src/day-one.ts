import childProcess from "node:child_process";

async function exec(command: string) {
  return new Promise((resolve, reject) => {
    childProcess.exec(command, (error, stdout, stderr) => {
      if (error !== null) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

type Entry = {
  body: string;
  date: Date;
  journal?: string;
};

export async function addEntry(entry: Entry) {
  const date = entry.date.toISOString().split("T")[0];
  let command = `dayone2 new "${entry.body}" --date "${date}"`;

  if (entry.journal) {
    command = `${command} --journal ${entry.journal}`;
  }

  const result = await exec(command);

  return result;
}
