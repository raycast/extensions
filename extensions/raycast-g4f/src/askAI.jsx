import useGPT from "./api/gpt.jsx";

export default function AskAI(props) {
  if (props?.launchContext?.props || props?.launchContext?.params) {
    // some other command has called this command
    let _props = props?.launchContext?.props || props;
    let _params = props?.launchContext?.params || {};
    return useGPT(_props, _params);
  }
  return useGPT(props, { showFormText: "Prompt", allowUploadFiles: true, webSearchMode: "auto" });
}
