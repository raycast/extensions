import { Flag, Envelope } from "./models";
import * as Exec from "./exec";

export async function list(): Promise<Envelope[]> {
  const { stdout, stderr } = await Exec.run('"himalaya" -o json list -s 100', {
    env: {
      PATH: Exec.PATH,
    },
  });

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
