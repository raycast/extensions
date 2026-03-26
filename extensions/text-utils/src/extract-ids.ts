import { extractSelection } from "./utils";

export default async function Command() {
  await extractSelection(
    (t) => t.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b\d{4,}\b/gi) || [],
    "IDs",
  );
}
