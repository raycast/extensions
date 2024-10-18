import useQuickAI from "./api/quickAI";

export default function SearchQA(props) {
  return useQuickAI(
    props,
    `Answer question using your knowledge as well as the extra information. The extra information is snippets of top related documents from Google search results, which can be noisy sometimes, feel free to ignore it if you find it not useful. \n\nHere's the question: `,
    false,
    2,
  );
}
