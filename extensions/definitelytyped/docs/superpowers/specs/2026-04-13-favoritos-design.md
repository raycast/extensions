# Design: Favoritos — DefinitelyTyped Raycast Extension

**Data:** 2026-04-13
**Status:** Aprovado

## Objetivo

Permitir que o usuário marque pacotes `@types/` como favoritos para acesso rápido, sem necessidade de redigitar a busca.

## Comportamento

### Tela inicial sem texto de busca

- Se houver favoritos salvos: exibe uma seção "Favorites" com os itens favoritados
- Se não houver favoritos: exibe o `EmptyView` atual ("Type at least 2 characters to search")

### Com texto de busca (≥2 caracteres)

- Favoritos somem da tela
- Resultados da busca aparecem normalmente (comportamento atual preservado)

### Favoritar / Desfavoritar

- Ação disponível no `ActionPanel` de cada item: "Add to Favorites" ou "Remove from Favorites" (título dinâmico)
- Atalho de teclado: `Cmd+F`
- Também clicável com o mouse via ActionPanel (comportamento padrão do Raycast)
- Funciona em qualquer contexto: lista de favoritos e resultados de busca

### Indicador visual

- Itens já favoritados exibem `Icon.StarCircle` em vez de `Icon.Code`
- Aplicado tanto nos favoritos quanto nos resultados de busca

## Dados

- Storage: `useLocalStorage<string[]>("dt-favorites", [])` do `@raycast/utils`
- Valor armazenado: array de `dirName` (ex: `["react", "node"]`)
- `dirName` é o identificador único já existente no código

## Implementação

Arquivo único: `src/types.tsx`. Sem novos arquivos.

### Mudanças necessárias

1. Adicionar `useLocalStorage` ao import de `@raycast/utils`
2. No `Command()`: instanciar `useLocalStorage<string[]>("dt-favorites", [])`
3. Função `toggleFavorite(dirName: string)`: adiciona se não existe, remove se existe
4. Render sem busca: `List.Section` com título "Favorites" listando favoritos convertidos via `toTypePackage`
5. Render com busca: comportamento atual inalterado
6. Ícone condicional em cada `List.Item`: `Icon.StarCircle` se favoritado, `Icon.Code` se não
7. Action no `ActionPanel` com título dinâmico e `shortcut={{ modifiers: ["cmd"], key: "f" }}`

## Restrições

- Sem commit nem push após implementação
- Sem novos arquivos além de `src/types.tsx`
- Sem novas dependências (usar `@raycast/utils` já existente)
