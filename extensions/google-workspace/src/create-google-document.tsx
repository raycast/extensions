import { createDocFromUrl } from "./helpers/docs";
import { withGoogleAuth } from "./components/withGoogleAuth";

async function Command(props: { arguments: Arguments.CreateGoogleDocument }) {
  await createDocFromUrl("document", props.arguments.title);
}

export default withGoogleAuth(Command);
