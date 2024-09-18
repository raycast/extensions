import useGemini from "./api/gemini";

export default function AskAI(props) {
  if (props?.launchContext?.buffer) {
    return useGemini({ ...props, arguments: props?.launchContext?.args }, { buffer: props?.launchContext?.buffer });
  } else {
    return useGemini(props, {});
  }
}
