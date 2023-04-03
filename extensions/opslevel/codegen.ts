import type { CodegenConfig } from '@graphql-codegen/cli'
 
const config: CodegenConfig = {
   schema: './src/client/schema.graphql',
   documents: ['src/**/*.ts'],
   ignoreNoDocuments: true,
   generates: {
      './src/client/gql/': {
        preset: 'client',
      }
   }
}
export default config

