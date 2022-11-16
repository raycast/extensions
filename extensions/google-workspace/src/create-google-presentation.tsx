import { createDocFromUrl } from "./helpers/docs";

export default async function Command(props: { arguments: { title?: string } }) {
  await createDocFromUrl("presentation", props.arguments.title);
}
