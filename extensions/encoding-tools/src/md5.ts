import { entrypoint, getInput, setOutput } from "../lib/utils";
import { createHash } from "crypto";

/**
 * MD5 hash.
 *
 * @author eth-p
 */
export default entrypoint(async () => {
  const contents = await getInput();
  const hash = createHash("md5");
  hash.write(contents);

  const output = hash.digest().toString("hex");
  await setOutput(output, "Created MD5 Hash");
});
