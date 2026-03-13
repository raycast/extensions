import useQuickAI from "./api/quickAI";

export default function Friendly(props) {
  return useQuickAI(props, "Make the following text seem more friendly.");
}
