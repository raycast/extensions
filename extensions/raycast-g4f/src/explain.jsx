import useGPT from "./api/gpt.jsx";

export default function Explain(props) {
  return useGPT(props, {
    context: "Explain the following text.",
    showFormText: "Text",
    useSelected: true,
    allowUploadFiles: true,
    useDefaultLanguage: true,
    webSearchMode: "auto",
  });
}
