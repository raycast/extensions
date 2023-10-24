import type { CodegenConfig } from '@graphql-codegen/cli';
 
const config: CodegenConfig = {
  // ...
  generates: {
    'src/graphql.ts': {
      schema: "./schema.graphql",
      documents: ["./src/**/*.graphql"],
      plugins: ['typescript', 'typescript-operations', 'typescript-graphql-request'],
      config: {
        rawRequest: true
      },
    },
  },
};
export default config;