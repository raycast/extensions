import { Icon } from "@raycast/api";
import { crc32, hashAll, previewTitle } from "./utils/toolbox";
import { InputForm } from "./components/InputForm";
import { ResultRow } from "./components/ResultList";

export default function Command() {
  return (
    <InputForm
      inputTitle="Text to Hash"
      placeholder="hello world"
      compute={(values) => {
        const input = values.input ?? "";
        if (!input) return [];
        const hashes = hashAll(input);
        const rows: ResultRow[] = [
          {
            id: "md5",
            title: previewTitle(hashes.md5),
            subtitle: "MD5",
            icon: Icon.Fingerprint,
            detail: hashes.md5,
            copyValue: hashes.md5,
          },
          {
            id: "sha1",
            title: previewTitle(hashes.sha1),
            subtitle: "SHA-1",
            icon: Icon.Fingerprint,
            detail: hashes.sha1,
            copyValue: hashes.sha1,
          },
          {
            id: "sha256",
            title: previewTitle(hashes.sha256),
            subtitle: "SHA-256",
            icon: Icon.Fingerprint,
            detail: hashes.sha256,
            copyValue: hashes.sha256,
          },
          {
            id: "sha512",
            title: previewTitle(hashes.sha512),
            subtitle: "SHA-512",
            icon: Icon.Fingerprint,
            detail: hashes.sha512,
            copyValue: hashes.sha512,
          },
          {
            id: "crc32",
            title: previewTitle(crc32(input)),
            subtitle: "CRC32",
            icon: Icon.Hashtag,
            detail: crc32(input),
            copyValue: crc32(input),
          },
          {
            id: "md5-upper",
            title: previewTitle(hashes.md5.toUpperCase()),
            subtitle: "MD5 (uppercase)",
            icon: Icon.Fingerprint,
            detail: hashes.md5.toUpperCase(),
            copyValue: hashes.md5.toUpperCase(),
          },
        ];
        return rows;
      }}
    />
  );
}
