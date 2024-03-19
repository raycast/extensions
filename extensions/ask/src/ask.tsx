import "./utils/polyfills";
import useResponse from "./components/response";

export default function Ask(props: { systemPrompt: string }) {
  return useResponse({
    systemPrompt: props.systemPrompt,
    allowPaste: true,
  });
}
