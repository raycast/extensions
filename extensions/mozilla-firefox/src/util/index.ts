import util from "util";
import fs from "fs";
import path from "path";

const fsReadDir = util.promisify(fs.readdir);

const userDataDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library", "Application Support", "Firefox", "Profiles");
};

const getProfileName = async () => {
  const profiles = await fsReadDir(userDataDirectoryPath());
  return profiles.filter((profile) => profile.endsWith(".default-release"))[0];
};

export const getHistoryDbPath = async () => path.join(userDataDirectoryPath(), await getProfileName(), "places.sqlite");

export const getSessionInactivePath = async () =>
  path.join(userDataDirectoryPath(), await getProfileName(), "sessionstore.jsonlz4");

export const getSessionActivePath = async () =>
  path.join(userDataDirectoryPath(), await getProfileName(), "sessionstore-backups", "recovery.jsonlz4");

export function decodeBlock(input: any, output: any, sIdx?: any, eIdx?: any) {
  sIdx = sIdx || 0;
  eIdx = eIdx || input.length - sIdx;
  let a;
  // Process each sequence in the incoming data
  for (let i = sIdx, n = eIdx, j = 0; i < n; ) {
    a = j;
    const token = input[i++];

    // Literals
    let literals_length = token >> 4;
    if (literals_length > 0) {
      // length of literals
      let l = literals_length + 240;
      while (l === 255) {
        l = input[i++];
        literals_length += l;
      }

      // Copy the literals
      const end = i + literals_length;
      while (i < end) output[j++] = input[i++];

      // End of buffer?
      if (i === n) return j;
    }

    // Match copy
    // 2 bytes offset (little endian)
    const offset = input[i++] | (input[i++] << 8);

    // 0 is an invalid offset value
    if (offset === 0 || offset > j) return -(i - 2);

    // length of match copy
    let match_length = token & 0xf;
    let l = match_length + 240;
    while (l === 255) {
      l = input[i++];
      match_length += l;
    }

    // Copy the match
    let pos = j - offset; // position of the match copy in the current output
    const end = j + match_length + 4; // minmatch = 4
    while (j < end) output[j++] = output[pos++];
  }

  return a;
}
