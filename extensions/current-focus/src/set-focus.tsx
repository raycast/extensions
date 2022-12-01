import { startFocus } from "./utils";

export default async function setFocus(props: { arguments: { title: string } }) {
  if (props?.arguments?.title) {
    return startFocus({
      text: props.arguments.title,
    });
  }
}
