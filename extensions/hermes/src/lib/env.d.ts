// O TypeScript 6 não inclui mais os pacotes @types automaticamente e o tsconfig do
// scaffold Raycast não declara "types". Sem esta referência faltam `fetch`, `URL`,
// `AbortSignal`, `NodeJS.*` e os módulos `node:*` usados por src/lib/**.
/// <reference types="node" />
