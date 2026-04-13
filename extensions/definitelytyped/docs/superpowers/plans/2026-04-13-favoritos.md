# Favoritos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar favoritos à extensão DefinitelyTyped — pacotes favoritados aparecem na tela inicial; ao pesquisar, somem e apenas os resultados da busca são exibidos.

**Architecture:** Todas as mudanças ocorrem em `src/types.tsx`. `useLocalStorage` do `@raycast/utils` persiste um array de `dirName`. A lógica de render é bifurcada: sem busca → mostra favoritos (ou EmptyView se vazio); com busca → comportamento atual.

**Tech Stack:** React, `@raycast/api`, `@raycast/utils` (já instalado), TypeScript

> **Nota:** Sem testes automatizados neste projeto. Verificação via `npm run build` e `npm run dev`.
> **Restrição:** Sem commit nem push após implementação.

---

### Task 1: Adicionar import e estado de favoritos

**Files:**
- Modify: `src/types.tsx`

- [ ] **Step 1: Adicionar `useLocalStorage` ao import de `@raycast/utils`**

Alterar linha 3 de:
```tsx
import { useFetch } from "@raycast/utils";
```
Para:
```tsx
import { useFetch, useLocalStorage } from "@raycast/utils";
```

- [ ] **Step 2: Adicionar estado de favoritos e `toggleFavorite` dentro de `Command()`**

Logo após `const shouldSearch = searchText.length >= 2;` (linha 81), adicionar:

```tsx
const { value: favorites = [], setValue: setFavorites } = useLocalStorage<string[]>("dt-favorites", []);

function toggleFavorite(dirName: string) {
  const isFav = favorites.includes(dirName);
  setFavorites(isFav ? favorites.filter((f) => f !== dirName) : [...favorites, dirName]);
}

const favoritePackages = useMemo(() => favorites.map(toTypePackage), [favorites]);
```

- [ ] **Step 3: Verificar compilação**

```bash
npm run build
```

Esperado: sem erros de TypeScript.

---

### Task 2: Atualizar render para exibir favoritos quando não há busca

**Files:**
- Modify: `src/types.tsx`

- [ ] **Step 1: Substituir o bloco `return` em `Command()`**

Substituir o `return` atual (linhas 103–146) pelo seguinte:

```tsx
return (
  <List
    isLoading={isLoading}
    filtering={false}
    throttle
    onSearchTextChange={setSearchText}
    searchBarPlaceholder="Search TypeScript type packages..."
    searchText={searchText}
  >
    {!shouldSearch ? (
      favoritePackages.length > 0 ? (
        <List.Section title="Favorites">
          {favoritePackages.map((pkg) => (
            <List.Item
              key={pkg.dirName}
              icon={Icon.StarCircle}
              title={pkg.displayName}
              subtitle={pkg.installName}
              actions={
                <ActionPanel>
                  <Action
                    title="Remove from Favorites"
                    icon={Icon.StarDisabled}
                    onAction={() => toggleFavorite(pkg.dirName)}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Install Command"
                    content={`npm install -D ${pkg.installName}`}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.OpenInBrowser
                    title="Open on npmx.dev"
                    url={pkg.npmxUrl}
                    shortcut={{ modifiers: ["cmd"], key: "x" }}
                  />
                  <Action.OpenInBrowser
                    title="Open on Npmjs.com"
                    url={pkg.npmUrl}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action.OpenInBrowser
                    title="Open on GitHub"
                    url={pkg.githubUrl}
                    shortcut={{ modifiers: ["cmd"], key: "g" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search @types packages"
          description="Type at least 2 characters to search"
        />
      )
    ) : (
      <>
        {EmptyView({ error, shouldSearch, isLoading, packages, searchText })}
        {packages.map((pkg) => {
          const isFavorite = favorites.includes(pkg.dirName);
          return (
            <List.Item
              key={pkg.dirName}
              icon={isFavorite ? Icon.StarCircle : Icon.Code}
              title={pkg.displayName}
              subtitle={pkg.installName}
              actions={
                <ActionPanel>
                  <Action
                    title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                    icon={isFavorite ? Icon.StarDisabled : Icon.Star}
                    onAction={() => toggleFavorite(pkg.dirName)}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Install Command"
                    content={`npm install -D ${pkg.installName}`}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.OpenInBrowser
                    title="Open on npmx.dev"
                    url={pkg.npmxUrl}
                    shortcut={{ modifiers: ["cmd"], key: "x" }}
                  />
                  <Action.OpenInBrowser
                    title="Open on Npmjs.com"
                    url={pkg.npmUrl}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action.OpenInBrowser
                    title="Open on GitHub"
                    url={pkg.githubUrl}
                    shortcut={{ modifiers: ["cmd"], key: "g" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </>
    )}
  </List>
);
```

- [ ] **Step 2: Verificar compilação**

```bash
npm run build
```

Esperado: sem erros de TypeScript.

- [ ] **Step 3: Verificar lint**

```bash
npm run lint
```

Esperado: sem erros ou warnings.

---

### Task 3: Testar manualmente via Raycast

**Files:** nenhum

- [ ] **Step 1: Iniciar dev mode**

```bash
npm run dev
```

- [ ] **Step 2: Verificar estado sem favoritos**

Abrir a extensão no Raycast. Esperado: EmptyView com "Type at least 2 characters to search".

- [ ] **Step 3: Favoritar um pacote**

Pesquisar "react", selecionar `@types/react`, pressionar `Cmd+F`. Esperado: ação "Add to Favorites" executada.

- [ ] **Step 4: Verificar tela inicial com favorito**

Limpar o campo de busca. Esperado: seção "Favorites" com `@types/react` listado com ícone de estrela.

- [ ] **Step 5: Verificar indicador visual na busca**

Pesquisar "react" novamente. Esperado: `@types/react` aparece com `Icon.StarCircle` e a ação mostra "Remove from Favorites".

- [ ] **Step 6: Desfavoritar**

Com `@types/react` selecionado nos resultados, pressionar `Cmd+F`. Esperado: ação "Remove from Favorites" executada. Limpar busca → seção "Favorites" some.
