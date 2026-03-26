import { extractSelection } from "./utils";

export default async function Command() {
  await extractSelection(
    (t) =>
      (t.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g) || []).filter((ip) =>
        ip.split(".").every((n) => parseInt(n) <= 255),
      ),
    "IPs",
  );
}
