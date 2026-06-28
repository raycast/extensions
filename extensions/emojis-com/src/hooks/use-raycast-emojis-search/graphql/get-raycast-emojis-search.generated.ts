import type { DocumentNode } from "graphql";

import type * as Types from "../../../utils/graphql/types.generated";

export type GetRaycastEmojisSearchQueryVariables = Types.Exact<{
  query?: Types.InputMaybe<Types.Scalars["String"]["input"]>;
  first?: Types.InputMaybe<Types.Scalars["Int"]["input"]>;
  after?: Types.InputMaybe<Types.Scalars["String"]["input"]>;
  order?: Types.InputMaybe<Types.SearchEmojiOrder>;
  modelIds?: Types.InputMaybe<ReadonlyArray<Types.Scalars["ID"]["input"]> | Types.Scalars["ID"]["input"]>;
  modelSlugs?: Types.InputMaybe<ReadonlyArray<Types.Scalars["String"]["input"]> | Types.Scalars["String"]["input"]>;
  modelCategory?: Types.InputMaybe<Types.ModelCategory>;
}>;

export type GetRaycastEmojisSearchQuery = {
  readonly __typename: "Query";
  readonly searchEmojis?:
    | {
        readonly __typename: "EmojiSearchResultWithTotal";
        readonly totalCount: number;
        readonly pageInfo: {
          readonly __typename: "PageInfo";
          readonly endCursor?: string | null | undefined;
          readonly hasNextPage: boolean;
        };
        readonly nodes: ReadonlyArray<{
          readonly __typename: "Emoji";
          readonly id: string;
          readonly slug: string;
          readonly prompt: string;
          readonly blob?:
            | { readonly __typename: "FileAttachment"; readonly url: string }
            | { readonly __typename: "ImageJpegAttachment"; readonly url: string }
            | { readonly __typename: "ImagePngAttachment"; readonly url: string }
            | { readonly __typename: "ImageSvgAttachment"; readonly url: string }
            | { readonly __typename: "ImageWebpAttachment"; readonly url: string }
            | null
            | undefined;
        }>;
      }
    | null
    | undefined;
};

export const GetRaycastEmojisSearchDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "GetRaycastEmojisSearch" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "query" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "first" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "after" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "order" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "SearchEmojiOrder" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "modelIds" } },
          type: {
            kind: "ListType",
            type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "ID" } } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "modelSlugs" } },
          type: {
            kind: "ListType",
            type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "modelCategory" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "ModelCategory" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "searchEmojis" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "query" },
                value: { kind: "Variable", name: { kind: "Name", value: "query" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "first" },
                value: { kind: "Variable", name: { kind: "Name", value: "first" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "after" },
                value: { kind: "Variable", name: { kind: "Name", value: "after" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "order" },
                value: { kind: "Variable", name: { kind: "Name", value: "order" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "modelIds" },
                value: { kind: "Variable", name: { kind: "Name", value: "modelIds" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "modelSlugs" },
                value: { kind: "Variable", name: { kind: "Name", value: "modelSlugs" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "modelCategory" },
                value: { kind: "Variable", name: { kind: "Name", value: "modelCategory" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "totalCount" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "pageInfo" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "endCursor" } },
                      { kind: "Field", name: { kind: "Name", value: "hasNextPage" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "nodes" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "slug" } },
                      { kind: "Field", name: { kind: "Name", value: "prompt" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "blob" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [{ kind: "Field", name: { kind: "Name", value: "url" } }],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
