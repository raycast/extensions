import { withGoogleAuth } from "./components/withGoogleAuth";
import { openURL } from "./helpers/docs";

async function Command() {
  await openURL("https://drive.google.com/drive/u/0/my-drive");
}

export default withGoogleAuth(Command);
