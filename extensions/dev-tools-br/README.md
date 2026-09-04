# Dev Tools BR para Raycast

Extensão local com geradores de dados mock, validadores brasileiros e utilitários de texto, computação, matemática e datas. O objetivo é substituir consultas repetitivas a sites durante desenvolvimento, QA e preenchimento de ambientes locais.

## O que está incluído

- **Geradores:** certidão, CNH, conta bancária mock, CPF, currículo em Markdown, letras Unicode, nicks, nomes, números aleatórios, PIS/PASEP, RENAVAM, veículo, placa, símbolos, CNPJ, CEP, RG, Inscrição Estadual, título de eleitor, cartão de crédito de teste, pessoa, empresa, imagem placeholder, Lorem Ipsum, senha e sorteio.
- **Validadores:** cartão, conta bancária mock, certidão, CNH, CNPJ, CPF, PIS/PASEP, RENAVAM, RG, título de eleitor e Inscrição Estadual.
- **Texto:** correções comuns, ordem alfabética, contadores, entidades HTML, corte, divisão, informações Unicode, inversão, estilos Unicode, conversão de caixa, número por extenso, remoção de acentos e troca de quebras de linha.
- **Computação:** Base64, binário, URL encode/decode, JSON, hashes e UUID v4.
- **Matemática:** romanos, fatoração, MDC, MMC, porcentagem, regra de três, resto da divisão e 13 calculadoras de área.
- **Datas:** diferença, soma e subtração de dias.

Todos os comandos ficam sob uma única entrada pesquisável, **Dev Tools BR**, e os resultados podem ser copiados ou colados diretamente no aplicativo ativo.

## Desenvolvimento local

Requisitos:

- Raycast instalado;
- Node.js 22 ou superior;
- npm.

```bash
npm install
npm run dev
```

O comando `npm run dev` abre a extensão em modo de desenvolvimento no Raycast. Para validar antes de distribuir:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Antes de publicar na Raycast Store, ajuste o campo `author` do `package.json` para o seu username exato no Raycast.

## Organização

```text
src/
├── index.tsx              # catálogo, navegação, formulários e resultados
├── types.ts               # contratos das ferramentas
├── lib/                   # algoritmos puros e testáveis
│   ├── documents.ts
│   ├── mock-data.ts
│   ├── text-tools.ts
│   ├── computer-tools.ts
│   ├── math-tools.ts
│   └── date-tools.ts
└── tools/                 # definições exibidas no Raycast
    ├── generators.ts
    ├── validators.ts
    ├── text.ts
    ├── computer.ts
    └── calculators.ts
```

Para adicionar uma ferramenta, crie a função pura em `src/lib` e registre uma `ToolDefinition` em `src/tools`. A interface genérica monta o formulário e a tela de resultado automaticamente.

## Segurança e limitações

- A extensão executa localmente e não chama o 4Devs.
- CPF, CNPJ, CNH, PIS/PASEP, RENAVAM, título, RG e IE verificam estrutura e dígitos; não consultam cadastros governamentais.
- CEP gerado é apropriado para testes de formato/faixa, mas não garante um endereço existente.
- Contas bancárias usam um esquema sintético próprio da extensão. O validador confirma esse esquema, não a existência da conta nem necessariamente o algoritmo privado de cada banco.
- Cartões passam pelo algoritmo de Luhn e devem ser usados exclusivamente em ambientes de teste. Gateways costumam exigir seus próprios cartões de sandbox.
- A correção ortográfica é uma lista rápida e offline de erros frequentes; não é um revisor gramatical completo.
- A imagem placeholder usa uma URL do serviço `placehold.co`; as demais ferramentas não precisam de rede.

Os algoritmos documentais são fornecidos por `@br-validators/core`, biblioteca TypeScript sem dependências de runtime, com referências a Receita Federal, CONTRAN, TSE, SEFAZ e outras fontes oficiais.

## Licença

MIT. Veja [LICENSE](./LICENSE).
