# Safari Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показывать профиль только для локальных вкладок Safari и добавить фильтр по профилю в Search Tabs через Cmd+P (List.Dropdown).

**Architecture:** Добавить опциональный `profileName` в цепочку Swift -> TS, отрендерить префиксом `<Profile> — <Title>`, и фильтровать в `cloud-tabs.tsx` через `searchBarAccessory`. Удаленные вкладки не трогаем; если профиль неизвестен — деградация без префикса.

**Tech Stack:** TypeScript / React (@raycast/api), Swift + ScriptingBridge (`swift/SafariTabs`), node --test

**Spec:** docs/superpowers/specs/2026-11-05-safari-profiles-design.md

## Global Constraints

- Только локальные вкладки получают профиль; remote/iCloud без профиля.
- Не менять `search-all` в v1 (общий `TabListItem` лишь подхватит префикс).
- Читать `SafariTabs.db` только read-only, если используем DB-путь.
- Не требовать разрешений сверх уже нужных (FDA).
- Сохранять поведение suspended tabs (`getTabUrl`) и существующих тестов.

## Review Focus

- `SafariTabs.db` не читается / нет FDA / схема другая → вкладка без префикса, дропдаун с одним `All`, без ошибок.
- Только один профиль → дропдаун `All` + профиль, фильтрация не ломает список.
- Профиль с пустым именем/пробелами → не показывать префикс, в дропдаун не добавлять.
- Выбран конкретный профиль → remote секции скрыты, local только этого профиля; `All` возвращает прежние секции.
- Поиск по имени профиля (`Personal`) должен находить вкладки этого профиля (search key), а выбор в дропдауне не должен сбрасываться при вводае текста.

---
### Task 1: Profile Types + Display Title

**Files:**
- Create: `src/profile.ts`
- Modify: `src/types.ts`, `src/utils.ts`, `src/components/TabListItem.tsx`
- Test: `test/profile.test.mts`

**Interfaces:**
- Consumes: `LooseTab` из `src/types.ts`
- Produces: `getDisplayTitle(tab: {title: string; profileName?: string}) -> string`, `getUniqueProfiles(tabs: {profileName?: string}[]) -> string[]`, `filterTabsByProfile(tabs, selectedProfile: string) -> tabs` (чистые функции в `src/profile.ts`)

- [ ] **Step 1: Write the failing test**

Create `test/profile.test.mts` с `node:test` + `node:assert/strict` (как `test/tab-snapshot.test.mts`): проверка `getDisplayTitle({title:"X", profileName:"Personal"}) === "Personal — X"`, без профиля — `"X"`, с `profileName="  "` — `"X"`; `getUniqueProfiles` — уникальные непустые в порядке появления; `filterTabsByProfile(tabs, "all")` — все, `"Personal"` — только с этим профилем, `"Missing"` — `[]`, вкладки без `profileName` при выборе конкретного — скрыты.

- [ ] **Step 2: Run test to verify it fails**
```bash
node --test test/profile.test.mts
```
Expected: FAIL — модуль `../src/profile.ts` не найден.

- [ ] **Step 3: Implement `src/profile.ts` + extend types and title**

В `src/profile.ts` реализовать три чистые функции. В `src/types.ts` добавить `profileName?: string` в `LooseTab` (чтобы попадал в `Tab/LocalTab/RemoteTab` и в поиск). В `src/utils.ts` обновить `getTitle` или делегировать к `getDisplayTitle` (оставить старое поведение без профиля). В `src/components/TabListItem.tsx` использовать `getDisplayTitle` для `title` prop.

- [ ] **Step 4: Run test to verify it passes**
```bash
node --test test/profile.test.mts
node --test test/tab-snapshot.test.mts
npm run lint
```
Expected: PASS, lint без новых ошибок.

- [ ] **Step 5: Commit**
```bash
git add src/profile.ts src/types.ts src/utils.ts src/components/TabListItem.tsx test/profile.test.mts
git commit -m "feat: add safari profile display helpers"
```

---

### Task 2: Swift Profile Retrieval Spike + Implementation

**Files:**
- Modify: `swift/SafariTabs/Sources/SafariTabs.swift`

**Interfaces:**
- Consumes: `safariAppIdentifier` / `SBApplication` из существующего кода
- Produces: `LocalTab.profileName: String?` (Codable) для `getLocalTabs`

- [ ] **Step 1: Spike — проверить два источника**

На машине с 2+ профилями:
  a) Добавить в `SafariWindow` временный KVC: `value(forKey: "profile")`, `"profileUUID"`, `"profileName"` — залогировать/проверить через `ray develop` (нет файлового теста для Swift).
  b) Если KVC пусто — проверить запрос для профилей из спеки: `SELECT b.title, REPLACE(s.server_id,'Setting_ProfileColor_','') FROM bookmarks b JOIN settings s ON s.parent=b.id WHERE b.type=1 AND b.subtype=2 AND s.server_id LIKE 'Setting_ProfileColor_%' AND (s.deleted IS NULL OR s.deleted=0)` в `~/Library/Containers/com.apple.Safari/Data/Library/Safari/SafariTabs.db` (только чтение), и найти джойн окна -> профиль в таблице окон (проверить `.schema windows` / `.schema tabs`).

Выписать вывод спайка комментом вверху `SafariTabs.swift` (какой путь сработал).

- [ ] **Step 2: Implement Swift**
Расширить `struct LocalTab` полем `profileName: String?` (с `Codable`, дефолт `nil` для обратной совместимости). В `getLocalTabs`: после сбора `tabData` проставить `profileName` по окну из сработавшего источника; если источник не дал — `nil`. Не ломать существующий batched путь. Все запросы к БД — read-only, с `try?` и деградацией.

- [ ] **Step 3: Verify build**

```bash
npm run lint
```
И внутри Raycast: `ray develop` успешно собирает Swift. Expected: сборка без ошибок. Если Swift не собрался из-за KVC-пути — упасть на DB-путь.

- [ ] **Step 4: Commit**
```bash
git add swift/SafariTabs/Sources/SafariTabs.swift
git commit -m "feat: include safari profile in local tabs"
```

---

### Task 3: Hook + Search Passthrough

**Files:**
- Modify: `src/hooks/useDevices.ts`, `src/cloud-tabs.tsx`

**Interfaces:**
- Consumes: `LocalTab.profileName` из Task 2, `filterTabsByProfile/getUniqueProfiles` из Task 1
- Produces: UI фильтрации в `cloud-tabs.tsx`

- [ ] **Step 1: Update search keys**
В `cloud-tabs.tsx` (и оставить `search-all.tsx` без дропдауна, но поиск по профилю там тоже оставить — это бесплатно) добавить в массив search keys `{ name: "profileName", weight: 1 }` ниже `title/url`, чтобы `Personal` находил вкладки.

- [ ] **Step 2: Update hook (no-op + type check)**
Убедиться что `useDevices.ts` пропускает `profileName` без перегруппировки (он придет от Swift). Если `useSQL` удаленные вкладки без профиля — они и так не попадут в `getUniqueProfiles`.

- [ ] **Step 3: Verify**
```bash
node --test test/profile.test.mts
npm run lint
```
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/cloud-tabs.tsx src/hooks/useDevices.ts
git commit -m "feat: search by safari profile name"
```

---

### Task 4: Cloud Tabs Dropdown Filtering

**Files:**
- Modify: `src/cloud-tabs.tsx`
- Create (if needed): `src/components/ProfileDropdown.tsx` (по образцу `BookmarksDropdown`)

**Interfaces:**
- Consumes: `devices` из `useDevices()`, `getUniqueProfiles/filterTabsByProfile` из Task 1
- Produces: фильтрованный список в `cloud-tabs`

- [ ] **Step 1: Implement dropdown**
`const [selectedProfile, setSelectedProfile] = useState("all")`. `List` получает `searchBarAccessory={<List.Dropdown tooltip="Select Safari profile" storeValue={true} onChange={...}> <Item value="all" title="All"/> + profiles }`. `profiles = getUniqueProfiles(devices.flatMap(d => d.tabs))`. При рендере секций: `filteredTabs = search(device.tabs, ...)` затем если `selectedProfile !== "all"` — пропустить все не-local секции и оставить только табы с `profileName === selectedProfile`.

- [ ] **Step 2: Verify manual UI**
В `ray develop`: Cmd+P открывает дропдаун как на скрине, `All` как сейчас, конкретный профиль — только его вкладки с префиксом `"<Profile> — ..."`, remote скрыты. При 0 профилей — только `All`. При смене текста поиска — фильтрация сохраняется.

- [ ] **Step 3: Lint + existing tests**
```bash
node --test test/profile.test.mts test/tab-snapshot.test.mts test/url.test.mts
npm run lint
```
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/cloud-tabs.tsx src/components/ProfileDropdown.tsx
git commit -m "feat: filter safari tabs by profile via cmd+p"
```
