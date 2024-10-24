import useQuickAI from "./api/quickAI";

export default function DocQA(props) {
  return useQuickAI(
    props,
    `Answer question using your knowledge as well as the provided document \n\nHere's the question: `,
    false,
    1,
  );
}
