import { createDocFromUrl } from "./helpers/docs";
import { withGoogleAuth } from "./components/withGoogleAuth";

async function Command(props: { arguments: Arguments.CreateGoogleForm }) {
  await createDocFromUrl("forms", props.arguments.title);
}

export default withGoogleAuth(Command);
