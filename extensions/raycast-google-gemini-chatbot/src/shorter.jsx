import useQuickAI from "./api/quickAI";

export default function Shorter(props) {
  return useQuickAI(props, "Make the following text shorter while keeping the core idea.");
}
