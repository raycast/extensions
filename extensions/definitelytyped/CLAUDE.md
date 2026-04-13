# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm run dev          # desenvolvimento com hot-reload via Raycast
npm run build        # build de produção
npm run lint         # verificar lint
npm run fix-lint     # corrigir lint automaticamente
npm run publish      # publicar na Raycast Store
```

> Não há testes automatizados neste projeto.

## Arquitetura

Extensão Raycast com um único comando (`types`) definido em `src/types.tsx`. Cada comando Raycast exporta um componente React padrão renderizando UI com `@raycast/api`.

O arquivo `package.json` é o manifesto da extensão — comandos, metadados e configurações da Raycast Store são definidos lá, não em arquivos separados.

### Padrão de componente

```tsx
import { List, ActionPanel, Action } from "@raycast/api";

export default function Command() {
  return <List>...</List>;
}
```

### Utilitários disponíveis

- `@raycast/api` — componentes de UI (List, Grid, Form, Detail), actions, hooks nativos
- `@raycast/utils` — `useFetch`, `usePromise`, `useLocalStorage`, cache, etc.
