import { withGoogleAuth } from "./components/withGoogleAuth";
import { createDocFromUrl } from "./helpers/docs";

async function Command(props: { arguments: Arguments.CreateGoogleForm }) {
  await createDocFromUrl("forms", props.arguments.title);
}

export default withGoogleAuth(Command);
