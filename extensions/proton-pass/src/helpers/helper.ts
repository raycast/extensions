import * as openpgp from "openpgp/lightweight";
import { readFile } from "fs/promises";
import { ProtonBackupFormData, PasswordMetadata } from "../api/proton-pass";
import { parse } from "tldts";
import { Icon, Image, Clipboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { setTimeout } from "timers/promises";
import { getRandomValues } from "crypto";

export async function getProtonBackup(backupFilePath: string, password: string) {
  const encryptedContent = await readFile(backupFilePath, { encoding: "utf-8" });
  const msg = await openpgp.readMessage({ armoredMessage: encryptedContent });
  const result = await openpgp.decrypt({
    message: msg,
    passwords: [password],
  });
  return JSON.parse(result.data.toString());
}

export async function getPasswordMetadata(
  backup_data: ProtonBackupFormData | undefined,
): Promise<PasswordMetadata[] | undefined> {
  if (backup_data == undefined) return [];
  const file = backup_data.filePath[0];
  // `rsp` has the keys of `userId`, `vaults`, and `version`
  const rsp = await getProtonBackup(file, backup_data.password);
  // `vaults has only on key which is `shareId`
  const vaults = rsp["vaults"];
  // get the `shareId` because it seems 'random' to get the value
  const shareId = Object.keys(vaults)[0];
  // a specific vault
  const personalVaults = vaults[shareId];
  // items in a personal vault
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemsPersonalVaults: any[] = personalVaults["items"];
  // for each item, get the data field object and cast it into `PasswordMetadata`
  return itemsPersonalVaults.map((item) => item["data"]) as PasswordMetadata[];
}

export async function clearClipboardPassword(duration_millis: number) {
  await setTimeout(duration_millis);
  await Clipboard.clear();
}

export function getRandomPassword(length: number, charset: string): string {
  let result = "";
  // avoid modulo bias
  const unbiased_limit = Math.floor(0xffffffff / charset.length) * charset.length;
  // make an empty array to store random characters
  const null_bytes = new Uint32Array(length);
  // initial random bytes
  const random_bytes = getRandomValues(null_bytes);

  // `random_bytes` may generate outside the biased limit, so we find the bytes that are under the `unbiased_limit` and push it to `result`
  for (let i = 0; i < random_bytes.length; i++) {
    // a random byte `random_bytes[i]` that is lower the `unbiased_limit` it is guaranteed that it is an evenly distributed group
    if (random_bytes[i] < unbiased_limit) {
      const evenly_distributed_random_char = charset[random_bytes[i] % charset.length];
      result += evenly_distributed_random_char;
    }
  }

  // there may be a chance that `result.length < length`, in that case, we need to generate more random characters to satisfy the constraint
  while (result.length < length) {
    const array = new Uint32Array(1);
    getRandomValues(array);
    if (array[0] < unbiased_limit) {
      const evenly_distributed_random_char = charset[array[0] % charset.length];
      result += evenly_distributed_random_char;
    }
  }

  return result;
}

export function getFirstHostnameProvidedUrl(credential: PasswordMetadata): string {
  if (credential.content.urls == undefined) return "";
  const prioritizedUrl = credential.content.urls[0];
  const parsedUrl = parse(prioritizedUrl);
  return parsedUrl.domain ? parsedUrl.domain : "";
}

export function getFaviconWithFallback(domain: string, fallback: Icon) {
  const { data } = useFetch<Image>(`https://favicone.com/${domain}`);
  return data ? data : fallback;
}
