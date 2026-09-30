import { graphql } from "../attention/lib/graphql";

/** Resolve the selected credential's identity without persisting credentials. */
export async function getLogin(): Promise<string> {
  const data = await graphql<{ viewer: { login: string } }>("query { viewer { login } }");
  return data.viewer.login;
}
