import { extname } from "path";
import { runInstantRename } from "./instant-runner";

export default async function () {
  await runInstantRename((f) => {
    const ext = extname(f);
    const name = f.slice(0, f.length - ext.length);
    return name.replace(/\s{2,}/g, " ").trim() + ext;
  }, "Collapse Spaces");
}
