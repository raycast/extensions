import { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "https://gql.hashnode.com",
  documents: "**/**/*.graphql",
  generates: {
    "./generated/hooks_and_more.ts": {
      plugins: ["typescript", "typescript-apollo-client-helpers", "typescript-operations", "typescript-react-apollo"],
      config: {
        withComponent: false,
        withHOC: false,
        withHooks: true,
        withMutationFn: true,
        withResultType: true,
        maybeValue: "T",
        preResolveTypes: true,
      },
    },
  },
};

export default config;
