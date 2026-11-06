# Safari Profiles Design

## Intent

Пользователь хочет видеть в Raycast-расширении Safari, в каком профиле открыт локальный таб, и фильтровать по профилю из строки поиска через дропдаун (Cmd+P). Скриншоты задают форму: титул с префиксом `<Profile> — <Title>` и дропдаун `All` справа от `Search tabs...`.

## Goals

- Для локальных вкладок показывать профиль (`Personal`, `C-Activities`, `dev` и т.д.).
- Дропдаун `All` + профили в `cloud-tabs` (Search Tabs). Cmd+P открывает дропдаун (Raycast `searchBarAccessory`).
- Поиск продолжает работать, желательно с учётом профиля.
- Если профиль неизвестен — показ как сейчас, без регрессии и без ошибок.

## Non-goals / Anti-goals

- Не показывать и не фильтровать профиль для remote/iCloud вкладок (нет надёжного источника, пользователь согласился).
- Не менять `search-all`, историю, закладки, Reading List.
- Не создавать новый profile manager, не трогать iCloud sync.
- Анти-цель: сломать текущую связку Swift -> TS или требовать новых разрешений сверх уже нужных Full Disk Access.

## Constraints

- `Safari.sdef` не отдаёт профиль окна/вкладки. `SBApplication` сейчас даёт только `id`, `tabs[].name/URL`.
- Local tabs ходят через `swift/SafariTabs/Sources/SafariTabs.swift` (`getLocalTabs(appName:) -> [LocalTab]`).
- Remote tabs — `CloudTabs.db` через `useSQL` в `useDevices.ts`.
- FDA уже требуется для `CloudTabs.db` и истории; чтение `SafariTabs.db` попадает под то же разрешение.
- Форматы БД Safari не публичные и могут меняться между версиями.
- UI: Raycast `@raycast/api ^1.103.10`, `List.Dropdown` + `searchBarAccessory`, есть прецедент `BookmarksDropdown`.

## Approaches

**1. Только `SafariTabs.db`**
Читать список профилей из `bookmarks (type=1, subtype=2)` + `settings (Setting_ProfileColor_<serverID>)` (запрос уже проверен в сообществах) и джойнить окно -> профиль по схеме окон/вкладок в той же БД. Плюс: предсказуемо. Минус: надо найти/подтвердить схему окон.

**2. Только KVC через ScriptingBridge**
Расширить `SafariWindow` протокол и попробовать `profile`/`profileUUID` через `value(forKey:)`. Плюс: дешево. Минус: высокий риск что Apple не отдаёт.

**3. Гибрид (выбрано)**
Спайк: KVC ~10 минут, fallback на DB. Если оба пустые — деградация без префикса. UI один и тот же во всех ветках.

## UI / How

- `src/types.ts`: `LocalTab.profileName?: string`, `Tab.profileName?: string` (или в `LooseTab` для единообразия поиска).
- `swift/SafariTabs.swift`: дополнить `LocalTab` полем `profileName` (отдача из выбранного источника). По возможности batched чтение не сломать — добавить после сбора `tabData`.
- `src/utils.ts` / `TabListItem.tsx`: `getTitle()` или рендер в `TabListItem` — `profileName ? \`${profileName} — ${title}\` : title`. Аксессуар домена оставить.
- `src/hooks/useDevices.ts`: пробросить `profileName` без изменения группировки по устройствам. Удаленные вкладки остаются без `profileName`.
- `src/cloud-tabs.tsx`:
  - `const [selectedProfile, setSelectedProfile] = useState("all")`
  - `searchBarAccessory={<List.Dropdown ... storeValue tooltip="Select Safari profile"> <Item All> + profiles }`
  - Фильтрация: если `selectedProfile !== "all"` — показывать только local tabs с этим `profileName`; remote девайсы скрываются; если 0 профилей — показать только `All` (пустой фолбэк).
  - Поиск (`search`): добавить `profileName` в `SEARCH_KEYS` (weight ниже title), чтобы `Personal` находил вкладки по профилю.
- `search-all.tsx` не трогать в v1 (профиль покажется сам, если `TabListItem` общий, но дропдауна там не будет).

## Edge Cases

- Профиль не найден / `SafariTabs.db` нет / KVC пусто → без префикса, дропдаун может быть только `All`.
- Только один профиль → дропдаун с `All` + ним, выбор не ломает список.
- Переименование профиля в Safari → подхватывается при следующем перечитывании (кэш `useCachedPromise`).
- Private / Technology Preview окна → тот же путь, профиль как пришёл.
- Выбор профиля не сохраняется между выходами по умолчанию (подумать над `storeValue` — по умолчанию хранить выбор в расширении).

## Risks

- Схема `SafariTabs.db` для окна->профиль может отличаться по версиям — спайк обязателен.
- KVC может часть времени отдавать `nil` — обязательная деградация.
- Префикс `—` может визуально спорить с `—` в самих титулах, но это как на скрине у пользователя.

## Builder Notes (оставлено имплементатору)

- Сначала спайк: на машине с 2+ профилями проверить запросы/ KVC. Закрепить находку комментом в Swift/TS.
- Читать `SafariTabs.db` только read-only (`mode=ro` / `?mode=ro`), не пишем туда никогда.
- Не ломать существующие тесты `test/` и не терять извлечение suspended tabs (`getTabUrl`).
- Коммит после каждой рабочей точки (спайк, тип, Swift, UI, фильтр).
