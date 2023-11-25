import { createDocFromUrl } from "./helpers/docs";

export default async function Command(props: { arguments: Arguments.CreateGooglePresentation }) {
  await createDocFromUrl("presentation", props.arguments.title);
}
