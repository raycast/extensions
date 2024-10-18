import useQuickAI from "./api/quickAI";

export default function IterativeRAG(props) {
  return useQuickAI(
    props,
    (query, examples) => ` ###Instruction###

You are an online information retrieval assistant to help users find useful information to answer their questions.
You use multiple steps to improve the accuracy of the final answer.
In each step, you can either:
1. create a new google search query to get overviews of top N related documents, each returned document includes title, url and a short snippet of the content.
2. read the full HTML content of a chosen document, you need to provide the url which is returned by step 1.

Remember to revise your search query when the returned search results are empty or not relevant to user's intention.
Reply the final answer in the same language as the question.
${examples}

###Let's do it###
User query:
${query}
`,
    false,
    3,
  );
}
