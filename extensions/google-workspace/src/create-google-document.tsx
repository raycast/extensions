import { createDocFromUrl } from "./helpers/docs";

export default async function Command(props: { arguments: Arguments.CreateGoogleDocument }) {
  await createDocFromUrl("document", props.arguments.title);
}
