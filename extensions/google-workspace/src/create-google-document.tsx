import { withGoogleAuth } from "./components/withGoogleAuth";
import { createDocFromUrl } from "./helpers/docs";

async function Command(props: { arguments: Arguments.CreateGoogleDocument }) {
  await createDocFromUrl("document", props.arguments.title);
}

export default withGoogleAuth(Command);
