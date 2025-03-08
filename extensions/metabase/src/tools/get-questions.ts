import { getQuestions } from "../lib/api";

export default async function () {
  const questions = await getQuestions();

  return {
    questions: questions.map((question) => ({
      id: question.id,
      name: question.name,
      description: question.description,
      createdAt: new Date(question.created_at),
      updatedAt: new Date(question.updated_at),
      archived: question.archived,
      databaseId: question?.dataset_query?.database,
      databaseQuery: question?.dataset_query?.native?.query,
      creator: {
        email: question.creator.email,
        firstName: question.creator.first_name,
        lastLogin: new Date(question.creator.last_login),
      },
    })),
  };
}
