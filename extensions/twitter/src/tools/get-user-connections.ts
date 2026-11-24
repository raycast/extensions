import { clientV2, ConnectionRelationship } from "../v2/lib/twitterapi_v2";

type Input = {
  /** Exact username of the account whose connections to list, with or without a leading @ sign. Can be any accessible account. */
  username: string;
  /** "following" lists accounts this user follows; "followers" lists accounts that follow this user. */
  relationship: ConnectionRelationship;
  /** Opaque token from a preceding call for the same username and relationship. Only pass when explicitly asked for more. */
  nextToken?: string;
};

/** Get one page of up to 20 followers or following for a specified account. Absence from one page does not prove no follow. */
export default async function getUserConnections(input: Input) {
  return await clientV2.getUserConnections(input.username, input.relationship, input.nextToken);
}
