import { getQuestions } from "../lib/api";

export default async function () {
  const questions = await getQuestions();

  return {
    questions: questions.map((question) => ({
      id: question.id,
      name: question.name,
      description: question.description,
      databaseId: question?.dataset_query?.database,
      databaseQuery: question?.dataset_query?.native?.query,
    })),
  };
}
