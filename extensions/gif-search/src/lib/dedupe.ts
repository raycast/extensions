import type { IGif } from "../models/gif";

export default function dedupe(values: Array<IGif>) {
  return Array.from(
    values
      .reduce((uniq, val: IGif) => {
        if (uniq.get(val.id.toString())) {
          return uniq;
        }

        uniq.set(val.id.toString(), val);
        return uniq;
      }, new Map<string, IGif>())
      .values()
  );
}
