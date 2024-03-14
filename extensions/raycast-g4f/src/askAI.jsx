import useGPT from "./api/gpt";

export default function AskAI(props) {
  if (props?.launchContext?.buffer) {
    return useGPT({ ...props, arguments: props?.launchContext?.args }, { buffer: props?.launchContext?.buffer });
  } else {
    return useGPT(props, {});
  }
}
