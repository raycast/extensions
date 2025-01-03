import { Clipboard } from "@raycast/api";
import { exec } from "child_process";

export class Password {
  name: string | undefined;
  path: string | undefined;
  directory: string | undefined;

  public async copyPassword() {
    exec(`pass '${this.path}'`, async (err, stdout, stderr) => {
      console.log(err);
      console.log(stdout);
      console.log(stderr);
      const password = stdout.split("\n")[0];
      await Clipboard.copy(password, { concealed: true });
    });
  }
}
