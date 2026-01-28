/* eslint-disable */
import * as types from "./graphql";
import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
const documents = {
  "\n  query Players {\n    players {\n      id\n      state {\n        muted\n        paused\n      }\n      streamData {\n        title\n        channelId\n        contentId\n        meetingKey\n        sessionKey\n      }\n      type\n      driverData {\n        driverNumber\n        tla\n        firstName\n        lastName\n        teamName\n      }\n    }\n  }\n":
    types.PlayersDocument,
  "\n  mutation PlayerSetPaused($playerSetPausedId: ID!, $paused: Boolean) {\n    playerSetPaused(id: $playerSetPausedId, paused: $paused)\n  }\n":
    types.PlayerSetPausedDocument,
  "\n  mutation PlayerSetMute($playerSetMutedId: ID!) {\n    playerSetMuted(id: $playerSetMutedId)\n  }\n":
    types.PlayerSetMuteDocument,
  "\n  mutation PlayerSync($playerSyncId: ID!) {\n    playerSync(id: $playerSyncId)\n  }\n": types.PlayerSyncDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  query Players {\n    players {\n      id\n      state {\n        muted\n        paused\n      }\n      streamData {\n        title\n        channelId\n        contentId\n        meetingKey\n        sessionKey\n      }\n      type\n      driverData {\n        driverNumber\n        tla\n        firstName\n        lastName\n        teamName\n      }\n    }\n  }\n",
): (typeof documents)["\n  query Players {\n    players {\n      id\n      state {\n        muted\n        paused\n      }\n      streamData {\n        title\n        channelId\n        contentId\n        meetingKey\n        sessionKey\n      }\n      type\n      driverData {\n        driverNumber\n        tla\n        firstName\n        lastName\n        teamName\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  mutation PlayerSetPaused($playerSetPausedId: ID!, $paused: Boolean) {\n    playerSetPaused(id: $playerSetPausedId, paused: $paused)\n  }\n",
): (typeof documents)["\n  mutation PlayerSetPaused($playerSetPausedId: ID!, $paused: Boolean) {\n    playerSetPaused(id: $playerSetPausedId, paused: $paused)\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  mutation PlayerSetMute($playerSetMutedId: ID!) {\n    playerSetMuted(id: $playerSetMutedId)\n  }\n",
): (typeof documents)["\n  mutation PlayerSetMute($playerSetMutedId: ID!) {\n    playerSetMuted(id: $playerSetMutedId)\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  mutation PlayerSync($playerSyncId: ID!) {\n    playerSync(id: $playerSyncId)\n  }\n",
): (typeof documents)["\n  mutation PlayerSync($playerSyncId: ID!) {\n    playerSync(id: $playerSyncId)\n  }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
