import useQuickAI from "./api/quickAI";

export default function Explain(props) {
  return useQuickAI(props, "Explain the following text as best as you can.");
}
