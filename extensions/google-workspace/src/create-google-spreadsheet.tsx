import { createDocFromUrl } from "./helpers/docs";

// The command doesn't have a title argument because
// Google doesn't seem to support this search query parameter
export default async function Command() {
  await createDocFromUrl("spreadsheets");
}
