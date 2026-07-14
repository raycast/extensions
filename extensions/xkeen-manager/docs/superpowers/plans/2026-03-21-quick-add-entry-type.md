# Quick Add — Entry Type Selector

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в Quick Add форму dropdown для выбора типа записи (domain, keyword, ext:geosite, ext:geoip), чтобы пользователь контролировал prefix при добавлении.

**Architecture:** Добавляем второй dropdown "Entry type" в QuickAddForm между Category и TextArea. Тип записи определяет нормализатор: вместо автовыбора по `field` категории используем явный выбор пользователя. Добавляем `normalizeKeywordToken` в routing.ts. Доступные типы фильтруются по `field` выбранной категории (domain-категории не предлагают geoip, ip-категории не предлагают domain/keyword).

**Tech Stack:** TypeScript, React, @raycast/api (Form.Dropdown)

---

### Task 1: Добавить normalizeKeywordToken в routing.ts

**Files:**
- Modify: `src/lib/routing.ts:286-333`

- [ ] **Step 1: Добавить normalizeKeywordToken**

В `src/lib/routing.ts` после `normalizeGeoipToken` (строка ~320) добавить:

```typescript
export function normalizeKeywordToken(raw: string): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  // Pass through already-prefixed values
  if (/^(domain:|keyword:|regexp:|full:|ext:)/i.test(v)) return v;
  return `keyword:${v}`;
}
```

- [ ] **Step 2: Добавить тип EntryType и маппинг нормализаторов**

В начале `src/lib/routing.ts` (после типа `RoutingCategory`) добавить:

```typescript
export type EntryType = "domain" | "keyword" | "geosite" | "geoip";

export const ENTRY_TYPES: Record<EntryType, { label: string; placeholder: string }> = {
  domain: { label: "domain:", placeholder: "example.com, another.org" },
  keyword: { label: "keyword:", placeholder: "youtube, telegram" },
  geosite: { label: "ext:geosite", placeholder: "google, youtube, category-ai-!cn" },
  geoip: { label: "ext:geoip", placeholder: "telegram, facebook, ru" },
};

export function entryTypesForField(field: "domain" | "ip" | "ruleSet"): EntryType[] {
  if (field === "ip") return ["geoip"];
  return ["domain", "keyword", "geosite"];
}

export function normalizerForEntryType(entryType: EntryType): (raw: string) => string | null {
  switch (entryType) {
    case "domain": return normalizeDomainToken;
    case "keyword": return normalizeKeywordToken;
    case "geosite": return normalizeGeositeToken;
    case "geoip": return normalizeGeoipToken;
  }
}
```

- [ ] **Step 3: Убедиться что normalizeGeositeToken экспортируется**

Проверить что `normalizeGeositeToken` (строка ~305) уже объявлена с `export`. Она есть — ОК.

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: success

- [ ] **Step 5: Commit**

```bash
git add src/lib/routing.ts
git commit -m "feat(routing): add entry type helpers and normalizeKeywordToken"
```

---

### Task 2: Обновить QuickAddForm — добавить Entry Type dropdown

**Files:**
- Modify: `src/components/QuickAddForm.tsx`

- [ ] **Step 1: Обновить импорты**

Заменить блок импортов из routing:

```typescript
import {
  parseRoutingCategories,
  insertDomainsIntoCategory,
  createRaycastCategory,
  findRaycastCategory,
  normalizerForEntryType,
  entryTypesForField,
  ENTRY_TYPES,
  splitInputs,
  type RoutingCategory,
  type EntryType,
} from "../lib/routing";
```

Убираем прямые импорты `normalizeDomainToken`, `normalizeGeoipToken`, `normalizeRuleSetToken` — теперь используем `normalizerForEntryType`.

- [ ] **Step 2: Добавить state для entryType**

После `const [rawText, setRawText] = useState("");` добавить:

```typescript
const [entryType, setEntryType] = useState<EntryType>("domain");
```

- [ ] **Step 3: Добавить helper для определения доступных типов и сброса при смене категории**

После state-деклараций добавить функцию-обработчик смены категории:

```typescript
function onCategoryChange(value: string) {
  setSelectedCategory(value);
  // Reset entry type to first available for new category
  if (value === "__raycast__") {
    setEntryType("domain");
    return;
  }
  const num = parseInt(value, 10);
  const cat = categories.find((c) => c.number === num);
  if (cat) {
    const available = entryTypesForField(cat.field);
    if (available.length > 0 && !available.includes(entryType)) {
      setEntryType(available[0]);
    }
  }
}
```

- [ ] **Step 4: Обновить onSubmit — использовать entryType**

Заменить блок нормализации (строки ~79-86):

```typescript
      // Select normalizer based on user-chosen entry type
      const normalizer = normalizerForEntryType(entryType);
      const tokens = splitInputs(input).map(normalizer).filter(Boolean) as string[];
```

- [ ] **Step 5: Добавить Entry Type dropdown в JSX**

Перед `return (` добавить вычисление доступных типов:

```typescript
  const availableTypes = (() => {
    if (selectedCategory === "__raycast__") return entryTypesForField("domain");
    const num = parseInt(selectedCategory, 10);
    const cat = categories.find((c) => c.number === num);
    return cat ? entryTypesForField(cat.field) : entryTypesForField("domain");
  })();
```

После Category dropdown (строка ~140) и перед TextArea добавить:

```tsx
      <Form.Dropdown
        id="entryType"
        title="Entry Type"
        value={entryType}
        onChange={(v) => setEntryType(v as EntryType)}
      >
        {availableTypes.map((t) => (
          <Form.Dropdown.Item key={t} value={t} title={ENTRY_TYPES[t].label} />
        ))}
      </Form.Dropdown>
```

- [ ] **Step 6: Обновить Category onChange**

Заменить `onChange={setSelectedCategory}` на `onChange={onCategoryChange}` в Category dropdown.

- [ ] **Step 7: Динамический placeholder для TextArea**

Заменить статический placeholder:

```tsx
      <Form.TextArea
        id="input"
        title="Values"
        placeholder={ENTRY_TYPES[entryType].placeholder}
      />
```

- [ ] **Step 8: Build + lint**

```bash
npm run build && npx ray lint
```

Expected: success

- [ ] **Step 9: Commit**

```bash
git add src/components/QuickAddForm.tsx
git commit -m "feat(quick-add): add entry type selector dropdown"
```

---

### Task 3: Ручное тестирование

- [ ] **Step 1: Запустить dev**

```bash
npm run dev
```

- [ ] **Step 2: Проверить сценарии**

1. Открыть Quick Add
2. Выбрать категорию с domain (например "3. AI и нейросети") → должны быть типы: domain, keyword, geosite
3. Выбрать категорию с ip (например "2. Telegram, соцсети") → должен быть только тип: geoip
4. Выбрать тип "keyword", ввести "test" → должно добавиться как `keyword:test`
5. Выбрать тип "geosite", ввести "spotify" → должно добавиться как `ext:geosite_v2fly.dat:spotify`
6. При смене категории с domain на ip — entry type автоматически переключается на geoip

- [ ] **Step 3: Commit финальный**

```bash
git add -A
git commit -m "feat(quick-add): entry type selector - tested and working"
```
