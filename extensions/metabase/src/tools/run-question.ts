import { Tool } from "@raycast/api";
import { getDatabase, getQuestion, runQuestion } from "../lib/api";

type Input = {
  /** The question ID to run */
  questionId: number;
  /** Defaults to `true` unless the user specifies otherwise */
  requiresConfirmation: boolean;
};

export default async function (input: Input) {
  const result = await runQuestion(input);

  return { result: result.data.rows };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!input.requiresConfirmation) {
    return;
  }

  const question = await getQuestion(input);

  let database;
  try {
    database = await getDatabase(question.dataset_query.database);
  } catch {
    // Failed to get database to display in the confirmation
  }

  return {
    message: "Are you sure you want to run this question?",
    info: [
      database
        ? {
            name: "Database",
            value: database.name,
          }
        : null,
      {
        name: "Name",
        value: question.name,
      },
      question.description
        ? {
            name: "Description",
            value: question.description,
          }
        : null,
      question.dataset_query?.native?.query
        ? {
            name: "Query",
            value: question.dataset_query?.native?.query,
          }
        : null,
    ].filter((x): x is { name: string; value: string } => !!x),
  };
};
