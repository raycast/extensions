import { createDocFromUrl } from "./helpers/docs";
import { withGoogleAuth } from "./components/withGoogleAuth";

async function Command(props: { arguments: Arguments.CreateGooglePresentation }) {
  await createDocFromUrl("presentation", props.arguments.title);
}

export default withGoogleAuth(Command);
