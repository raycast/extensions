import type { DocumentNode } from "graphql"

import type * as Types from "@/utils/graphql/types.generated"

export type SearchEmojisQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars["Int"]["input"]>
  query?: Types.InputMaybe<Types.Scalars["String"]["input"]>
  after?: Types.InputMaybe<Types.Scalars["String"]["input"]>
  order?: Types.InputMaybe<Types.SearchEmojiOrder>
}>

export type SearchEmojisQuery = {
  readonly __typename: "Query"
  readonly searchEmojis?:
    | {
        readonly __typename: "EmojiSearchResultWithTotal"
        readonly pageInfo: {
          readonly __typename: "PageInfo"
          readonly endCursor?: string | null | undefined
          readonly hasNextPage: boolean
        }
        readonly nodes: ReadonlyArray<{
          readonly __typename: "Emoji"
          readonly id: string
          readonly slug: string
          readonly prompt: string
          readonly blob?:
            | { readonly __typename: "FileAttachment"; readonly url: string }
            | { readonly __typename: "ImageJpegAttachment"; readonly url: string }
            | { readonly __typename: "ImagePngAttachment"; readonly url: string }
            | { readonly __typename: "ImageSvgAttachment"; readonly url: string }
            | { readonly __typename: "ImageWebpAttachment"; readonly url: string }
            | null
            | undefined
        }>
      }
    | null
    | undefined
}

export const SearchEmojisDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "SearchEmojis" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "first" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "query" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
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
                name: { kind: "Name", value: "first" },
                value: { kind: "Variable", name: { kind: "Name", value: "first" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "query" },
                value: { kind: "Variable", name: { kind: "Name", value: "query" } },
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
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
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
} as unknown as DocumentNode
