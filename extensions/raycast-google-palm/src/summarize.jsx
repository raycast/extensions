import useQuickAI from "./api/quickAI";

export default function Summarize(props) {
  return useQuickAI(props, "Summarize the given text.");
}
