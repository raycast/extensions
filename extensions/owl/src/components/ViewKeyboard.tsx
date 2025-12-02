import { Detail } from "@raycast/api";

export default function ViewKeyboard(
  props: Readonly<{
    keyboard: string;
  }>,
) {
  return (
    <Detail markdown={`# ${props.keyboard}\n\n![Preview](keyboards/png/${encodeURIComponent(props.keyboard)}.png)`} />
  );
}
