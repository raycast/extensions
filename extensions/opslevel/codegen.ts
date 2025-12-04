import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
    schema: [
        {
            "https://app.opslevel.com/graphql": {
                method: "POST",
                headers: {
                    "GraphQL-Visibility": "internal",
                    Authorization: `Bearer ${process.env.OPSLEVEL_TOKEN}`,
                },
            },
        },
    ],

    documents: ["src/**/*.ts", "src/**/*.graphql"],
    ignoreNoDocuments: true,
    generates: {
        "./src/client/gql-types.d.ts": {
            plugins: ["typescript", "typescript-operations"],
            config: {
                onlyOperationTypes: true,
                avoidOptionals: true,
                immutableTypes: true,
            },
        },
    },
};
export default config;
