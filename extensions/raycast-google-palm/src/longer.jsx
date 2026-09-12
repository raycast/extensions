import useQuickAI from "./api/quickAI";

export default function Longer(props) {
  return useQuickAI(props, "Make the following text longer without providing any extra information than what's given.");
}
