import { entrypoint, getInput, setOutput, ToastException } from "../lib/utils";

/**
 * Base64 decoding.
 *
 * @author eth-p
 */
export default entrypoint(async () => {
  const contents = await getInput();
  const decoded = Buffer.from(contents.toString("utf8"), "base64").toString("utf8");
  const encoded = Buffer.from(decoded, "utf8").toString("base64");

  if (encoded !== contents.toString("utf8")) {
    throw new ToastException("Clipboard contents not Base64-encoded.");
  }

  await setOutput(decoded, "Decoded from Base64");
});
