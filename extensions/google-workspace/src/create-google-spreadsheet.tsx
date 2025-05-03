import { createDocFromUrl } from "./helpers/docs";
import { withGoogleAuth } from "./components/withGoogleAuth";

async function Command() {
  await createDocFromUrl("spreadsheets");
}

export default withGoogleAuth(Command);
