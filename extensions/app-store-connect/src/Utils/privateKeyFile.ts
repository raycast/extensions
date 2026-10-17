import fs from "fs";
import { encodeBase64 } from "./base64";

/**
 * Reads a .p8 private key from disk and returns it base64-encoded for storage.
 *
 * Throws — rather than returning nothing — when the path is not a readable file. Both
 * credential forms previously returned silently on a bad path, leaving a submitted form
 * that did nothing and said nothing; a thrown error reaches the form's catch and is
 * shown as a toast like every other failure.
 *
 * The existence check and the read are one step on purpose: a check that passes and a
 * read that then throws (permissions, a file removed between picking and submitting, a
 * path that is a directory) is exactly the case that has to surface.
 */
export function readPrivateKeyFile(file: string | undefined): string {
  if (!file) {
    throw new Error("Select a private key file (.p8) to continue.");
  }
  if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
    throw new Error(`Not a readable file: ${file}`);
  }
  return encodeBase64(fs.readFileSync(file, "utf8"));
}
