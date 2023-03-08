import { createDocFromUrl } from "./helpers/docs";

export default async function Command(props: { arguments: { title?: string } }) {
  await createDocFromUrl("document", props.arguments.title);
}
