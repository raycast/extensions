import { entrypoint, getInput, setOutput } from "../lib/utils";

/**
 * Base64 encoding.
 *
 * @author eth-p
 */
export default entrypoint(async () => {
  const contents = await getInput();
  const output = contents.toString("base64");
  await setOutput(output, "Encoded to Base64");
});
