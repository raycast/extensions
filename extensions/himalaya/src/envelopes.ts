import { Envelope, Flag } from "./models";
import * as Exec from "./exec";

export async function list(folder: string, account: string): Promise<Envelope[]> {
  const cmd = `himalaya --account "${account}" --folder "${folder}" -o json list -s 100`;
  console.debug(`cmd: ${cmd}`);
  const { stdout, stderr } = await Exec.run(cmd, { env: { PATH: Exec.PATH } });

  if (stdout) {
    const results: any = JSON.parse(stdout);

    const envelopes: Envelope[] = results.map((result: any) => {
      const envelope: Envelope = {
        id: result.id,
        internal_id: result.internal_id,
        message_id: result.message_id,
        flags: result.flags.map((flag: string) => flag as Flag),
        from: {
          name: result.from.name,
          addr: result.from.addr,
        },
        subject: result.subject,
        date: new Date(result.date),
      };

      return envelope;
    });

    return envelopes;
  } else if (stderr) {
    console.error(stderr);

    return [];
  } else {
    throw new Error("No results from stdout or stderr");
  }
}
