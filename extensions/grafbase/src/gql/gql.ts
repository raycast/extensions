/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";

import * as types from "./graphql";

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel-plugin for production.
 */
const documents = {
  "\n  query GetProjectBranches($accountSlug: String!, $projectSlug: String!) {\n    projectByAccountSlug(accountSlug: $accountSlug, projectSlug: $projectSlug) {\n      branches(last: 6) {\n        edges {\n          node {\n            id\n            name\n            activeDeployment {\n              createdAt\n            }\n          }\n        }\n      }\n    }\n  }\n":
    types.GetProjectBranchesDocument,
  "\n  query GetDeploymentsForBranch($name: String!, $accountSlug: String!, $projectSlug: String!) {\n    branch(name: $name, accountSlug: $accountSlug, projectSlug: $projectSlug) {\n      deployments(last: 6) {\n        edges {\n          cursor\n          node {\n            id\n            status\n            createdAt\n            commit {\n              message\n              author\n              authorAvatarUrl\n            }\n          }\n        }\n      }\n    }\n  }\n":
    types.GetDeploymentsForBranchDocument,
  "\n  query GetProjectsByAccountSlug($slug: String!) {\n    accountBySlug(slug: $slug) {\n      projects {\n        edges {\n          cursor\n          node {\n            id\n            slug\n            repository {\n              url\n            }\n            productionBranch {\n              name\n              domains\n              activeDeployment {\n                id\n                createdAt\n              }\n              latestDeployment {\n                id\n                createdAt\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n":
    types.GetProjectsByAccountSlugDocument,
  "\n  query GetScopes {\n    viewer {\n      # ...BasicUserInfo\n      id\n      name\n      avatarUrl\n      personalAccount {\n        # ...BasicPersonalAccountInfo\n        id\n        name\n        slug\n      }\n      organizationMemberships {\n        # ...BasicMembershipInfo\n        account {\n          id\n          slug\n          name\n        }\n      }\n    }\n  }\n":
    types.GetScopesDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
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
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query GetProjectBranches($accountSlug: String!, $projectSlug: String!) {\n    projectByAccountSlug(accountSlug: $accountSlug, projectSlug: $projectSlug) {\n      branches(last: 6) {\n        edges {\n          node {\n            id\n            name\n            activeDeployment {\n              createdAt\n            }\n          }\n        }\n      }\n    }\n  }\n"
): (typeof documents)["\n  query GetProjectBranches($accountSlug: String!, $projectSlug: String!) {\n    projectByAccountSlug(accountSlug: $accountSlug, projectSlug: $projectSlug) {\n      branches(last: 6) {\n        edges {\n          node {\n            id\n            name\n            activeDeployment {\n              createdAt\n            }\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query GetDeploymentsForBranch($name: String!, $accountSlug: String!, $projectSlug: String!) {\n    branch(name: $name, accountSlug: $accountSlug, projectSlug: $projectSlug) {\n      deployments(last: 6) {\n        edges {\n          cursor\n          node {\n            id\n            status\n            createdAt\n            commit {\n              message\n              author\n              authorAvatarUrl\n            }\n          }\n        }\n      }\n    }\n  }\n"
): (typeof documents)["\n  query GetDeploymentsForBranch($name: String!, $accountSlug: String!, $projectSlug: String!) {\n    branch(name: $name, accountSlug: $accountSlug, projectSlug: $projectSlug) {\n      deployments(last: 6) {\n        edges {\n          cursor\n          node {\n            id\n            status\n            createdAt\n            commit {\n              message\n              author\n              authorAvatarUrl\n            }\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query GetProjectsByAccountSlug($slug: String!) {\n    accountBySlug(slug: $slug) {\n      projects {\n        edges {\n          cursor\n          node {\n            id\n            slug\n            repository {\n              url\n            }\n            productionBranch {\n              name\n              domains\n              activeDeployment {\n                id\n                createdAt\n              }\n              latestDeployment {\n                id\n                createdAt\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n"
): (typeof documents)["\n  query GetProjectsByAccountSlug($slug: String!) {\n    accountBySlug(slug: $slug) {\n      projects {\n        edges {\n          cursor\n          node {\n            id\n            slug\n            repository {\n              url\n            }\n            productionBranch {\n              name\n              domains\n              activeDeployment {\n                id\n                createdAt\n              }\n              latestDeployment {\n                id\n                createdAt\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query GetScopes {\n    viewer {\n      # ...BasicUserInfo\n      id\n      name\n      avatarUrl\n      personalAccount {\n        # ...BasicPersonalAccountInfo\n        id\n        name\n        slug\n      }\n      organizationMemberships {\n        # ...BasicMembershipInfo\n        account {\n          id\n          slug\n          name\n        }\n      }\n    }\n  }\n"
): (typeof documents)["\n  query GetScopes {\n    viewer {\n      # ...BasicUserInfo\n      id\n      name\n      avatarUrl\n      personalAccount {\n        # ...BasicPersonalAccountInfo\n        id\n        name\n        slug\n      }\n      organizationMemberships {\n        # ...BasicMembershipInfo\n        account {\n          id\n          slug\n          name\n        }\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<
  infer TType,
  any
>
  ? TType
  : never;
