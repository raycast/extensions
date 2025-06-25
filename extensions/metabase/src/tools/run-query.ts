import { Tool } from "@raycast/api";
import { getDatabase, runQuery } from "../lib/api";

type Input = {
  /** The SQL query to run */
  query: string;
  /** The database ID to run the query against */
  databaseId: number;
};

export default async function (input: Input) {
  const result = await runQuery(input);

  return { result: result.rows };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const database = await getDatabase(input.databaseId);

  return {
    message: "Are you sure you want to run this query?",
    info: [
      {
        name: "Database",
        value: database.name,
      },
      {
        name: "Query",
        value: input.query,
      },
    ],
  };
};
