import { createDocFromUrl } from "./helpers/docs";

export default async function Command(props: { arguments: Arguments.CreateGoogleForm }) {
  await createDocFromUrl("forms", props.arguments.title);
}
