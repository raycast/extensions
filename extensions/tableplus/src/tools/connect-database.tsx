import { open } from "@raycast/api";

type Input = {
  /**
   * The ID of the database to connect to.
   * Use the `get-databases` tool to get the ID of the database.
   */
  id: string;
};

export default async function connectToDatabase(input: Input) {
  await open(`tableplus://?id=${input.id}`);
}
