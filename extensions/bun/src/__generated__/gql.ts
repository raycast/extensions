/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 */
const documents = {
    "\n  query Versions($owner: String!, $name: String!, $page: String) {\n    repository(owner: $owner, name: $name) {\n      releases(first: 100, after: $page) {\n        nodes {\n          name\n          tagName\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": types.VersionsDocument,
    "\n  query LatestVersion($owner: String!, $name: String!) {\n    repository(owner: $owner, name: $name) {\n      latestRelease {\n        name\n        tagName\n        tagCommit {\n          commitUrl\n        }\n      }\n    }\n  }\n": types.LatestVersionDocument,
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
export function gql(source: "\n  query Versions($owner: String!, $name: String!, $page: String) {\n    repository(owner: $owner, name: $name) {\n      releases(first: 100, after: $page) {\n        nodes {\n          name\n          tagName\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query Versions($owner: String!, $name: String!, $page: String) {\n    repository(owner: $owner, name: $name) {\n      releases(first: 100, after: $page) {\n        nodes {\n          name\n          tagName\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query LatestVersion($owner: String!, $name: String!) {\n    repository(owner: $owner, name: $name) {\n      latestRelease {\n        name\n        tagName\n        tagCommit {\n          commitUrl\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query LatestVersion($owner: String!, $name: String!) {\n    repository(owner: $owner, name: $name) {\n      latestRelease {\n        name\n        tagName\n        tagCommit {\n          commitUrl\n        }\n      }\n    }\n  }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;