import { withGoogleAuth } from "./components/withGoogleAuth";
import { createDocFromUrl } from "./helpers/docs";

async function Command() {
  await createDocFromUrl("spreadsheets");
}

export default withGoogleAuth(Command);
