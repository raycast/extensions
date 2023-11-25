import useQuickAI from "./api/quickAI";

export default function Comment(props) {
  return useQuickAI(props, "Add comments to the given code.");
}
