import { Password } from "./password";
import * as fs from "fs";
import * as path from "path";
import { getPreferenceValues } from "@raycast/api";

export async function getPasswords(): Promise<Password[]> {
  const preferences = getPreferenceValues<Preferences>();

  const passwords = new Array<Password>();
  const passwordStoreDir = preferences["password-store-path"];
  console.log(passwordStoreDir);
  fs.readdir(
    passwordStoreDir,
    { withFileTypes: true, recursive: true },
    (errors, files) => {
      console.log(files.length);
      files
        .filter(
          (file) =>
            !file.name.startsWith(".") && path.extname(file.name) == ".gpg",
        )
        .forEach((file) => {
          const password: Password = new Password();
          password.name = file.name.replace(/\.[^/.]+$/, "");
          password.directory = path.join(file.path, file.name);
          password.path = path
            .relative(passwordStoreDir, password.directory)
            .replace(/\.[^/.]+$/, "");
          passwords.push(password);
        });
      console.log(passwords.length);
    },
  );
  return passwords;
}
