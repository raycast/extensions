import { Folder } from "./models";
import * as Exec from "./exec";

export async function list(): Promise<Folder[]> {
  const { stdout, stderr } = await Exec.run('"himalaya" -o json folder list', {
    env: {
      PATH: Exec.PATH,
    },
  });

  if (stdout) {
    const results: any = JSON.parse(stdout);

    const folders: Folder[] = results.map((result: any) => {
      const folder: Folder = {
        delim: result.delim,
        name: result.name,
        desc: result.desc,
      };

      return folder;
    });

    return folders;
  } else if (stderr) {
    console.error(stderr);

    return [];
  } else {
    throw new Error("No results from stdout or stderr");
  }
}
