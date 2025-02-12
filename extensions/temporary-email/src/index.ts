import { showHUD, open, Clipboard, getPreferenceValues } from "@raycast/api";
import { randomUUID } from "crypto";

type EmailServices = "maildrop.cc" | "harakirimail.com";

const { mailservice } = getPreferenceValues<{ mailservice: EmailServices }>();

const RANDOM_EMAIL = randomUUID();

const MAILSERVICE_MAPPING: {
  [service in EmailServices]: () => [/** email */ string, /** url */ string];
} = {
  "maildrop.cc": () => {
    return [`${RANDOM_EMAIL}@maildrop.cc`, `https://maildrop.cc/inbox/?mailbox=${RANDOM_EMAIL}`];
  },
  "harakirimail.com": () => {
    return [`${RANDOM_EMAIL}@harakirimail.com`, `https://harakirimail.com/inbox/${RANDOM_EMAIL}`];
  },
};

export default async function main() {
  const [email, url] = MAILSERVICE_MAPPING[mailservice]();

  await open(url);

  Clipboard.copy(email);
  await showHUD(`Copied email ${email} to clipboard`);
}
