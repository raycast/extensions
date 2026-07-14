# xkeen-manager v2 — Лог изменений

> Сессия рефакторинга и доработок, 21 марта 2026

## Обзор

Полный рефакторинг расширения из монолита (2060 строк в одном файле) в модульную архитектуру с исправлением багов и новыми фичами.

---

## 1. Рефакторинг: монолит → модули

**Было:** `src/xkeen-manager.tsx` — 2060 строк, вся логика в одном файле.

**Стало:** 16 модулей с чёткими границами ответственности.

### Новые библиотечные модули (`src/lib/`)

| Файл | Назначение | Способ реализации |
|------|-----------|-------------------|
| `utils.ts` | Утилиты: `Prefs`, `getPaths`, `stripAnsi`, `cleanOutput`, `shQuote`, `fetchIp`, `parseSshJson`, `parseKeyValueLines`, `extractIpv4`, `mdCode` | Извлечение чистых функций из монолита |
| `ssh.ts` | SSH-транспорт: `runRemote`, `runRemoteRaw`, очередь команд, retry с backoff | Извлечение + добавление очереди для anti-ban |
| `json.ts` | `stripJsonComments` (посимвольный парсер), `tryParseJson`, `validateXrayJson`, `countChangedLines` | Извлечение + новый парсер комментариев |
| `files.ts` | `readRemoteFile`, `writeRemoteFile`, `safeWriteRemoteFile`, backup/restore | Извлечение + маркерный протокол (см. баг-фиксы) |
| `health.ts` | `loadStartupData` (одним SSH-запросом), `verifyTrafficPath` | Новый — объединение 3 последовательных вызовов в 1 |
| `profiles.ts` | `ProfileMeta`, `validateProfileName`, `readProfileMeta`, `writeProfileMeta` | Извлечение |
| `routing.ts` | Парсинг категорий из комментариев, text-based вставка, нормализаторы, `EntryType` | Новый — ключевой модуль для Quick Add |

### Новые компоненты (`src/components/`)

| Файл | Назначение |
|------|-----------|
| `QuickAddForm.tsx` | Форма добавления записей с выбором категории и типа |
| `JsonEditor.tsx` | Редактор конфигов с сохранением комментариев |
| `ProfilesList.tsx` | Управление профилями VLESS |
| `LogsDetail.tsx` | Просмотр логов + рестарт |
| `IpDetail.tsx` | Проверка IP (direct vs VPN) |
| `HealthDetail.tsx` | Состояние здоровья системы |
| `BackupsHub.tsx` | Управление бэкапами |

### Главный компонент

`src/xkeen-manager.tsx` — ~220 строк вместо 2060. Три секции (Xkeen, Routing, Manage), 6 пунктов вместо 8.

**Способ реализации:** superpowers:subagent-driven-development — по одному агенту на каждый task из плана, с двухступенчатым ревью (spec + quality).

---

## 2. Оптимизация производительности

**Было:** 3 последовательных SSH-вызова + 500ms sleep между ними → 3-6 сек на запуск.

**Стало:** 1 комбинированный SSH-вызов (`loadStartupData`) с маркерами `___STATUS_START___`/`___STATUS_END___` + key=value парсинг → ~1-2 сек.

**Способ:** Все данные (status, OPT mounted, writable, free space, xkeen available, uptime, active profile) собираются одной shell-командой и парсятся на клиенте.

---

## 3. Баг-фиксы

### Баг: env vars из Keenetic shell попадают в stdout

**Симптом:** В предпросмотре routing появлялись `export HOME=`, `export PATH=` и т.д.

**Корневая причина:** Keenetic shell при SSH-подключении выводит переменные окружения в stdout. Старый `cleanOutput()` фильтровал их, но также уничтожал форматирование файлов (`.map(l => l.trim())` + `.filter(Boolean)`).

**Фикс:** Маркерный протокол в `readRemoteFile` — SSH-команда оборачивает вывод `cat` в `___FILE_START___`/`___FILE_END___`, клиент извлекает содержимое между маркерами. Env-шум гарантированно отсекается, форматирование файла сохраняется.

### Баг: OPT показывает "не смонтирован"

**Симптом:** Health всегда показывал OPT not mounted.

**Корневая причина:** `mount | grep -q " on /opt "` не матчил формат mount на Keenetic.

**Фикс:** Заменён на `[ -d /opt/bin ]` — прямая проверка наличия директории Entware.

### Баг: комментарии отсутствуют в routing

**Симптом:** Предпросмотр routing без комментариев, категории не парсятся.

**Корневая причина:** Не баг кода — файл на роутере был ранее перезаписан старым кодом (JSON.parse → JSON.stringify), который уничтожил комментарии.

**Фикс:** Восстановление файла из локальной копии через `cat | ssh`. Новый код пишет raw text, не парсит/стрингифицирует JSON.

**Способ диагностики:** superpowers:systematic-debugging — Phase 1 (сбор доказательств через SSH), установление что проблема в данных, а не в коде.

---

## 4. UX-улучшения

### Компактные комментарии в routing

**Было:** 3-строчные блоки комментариев:
```
// ============================================================
// 1. DIRECT — российские и локальные сервисы
// ============================================================
```

**Стало:** Однострочные с логичным форматом:
```
// 1. Российские и локальные сервисы (direct domain)
```

Формат: `N. Категория (proxy/direct domain/ip)` — сначала название, потом тип маршрутизации.

### Обновлён regex парсинга категорий

Regex в `parseRoutingCategories` обновлён для поддержки как старого 3-строчного, так и нового однострочного формата комментариев.

### Crash alert

При запуске, если xkeen не запущен — показывается Toast с предупреждением и именем последнего профиля.

### Экран сокращён

8 пунктов → 6, 3 секции (Xkeen, Routing, Manage) вместо плоского списка.

---

## 5. Новая фича: Entry Type selector в Quick Add

**Что:** Dropdown для выбора типа записи при добавлении в routing.

**Типы:**
- `domain:` — для доменов (example.com → domain:example.com)
- `keyword:` — для ключевых слов (youtube → keyword:youtube)
- `ext:geosite` — для geosite баз (google → ext:geosite_v2fly.dat:google)
- `ext:geoip` — для geoip баз (telegram → ext:geoip_v2fly.dat:telegram)

**Поведение:**
- Доступные типы фильтруются по полю категории (domain-категории → domain/keyword/geosite, ip-категории → только geoip)
- При смене категории тип автоматически сбрасывается
- Placeholder меняется динамически

**Новые экспорты в routing.ts:** `EntryType`, `ENTRY_TYPES`, `entryTypesForField()`, `normalizerForEntryType()`, `normalizeKeywordToken()`.

**Способ реализации:** superpowers:writing-plans → superpowers:subagent-driven-development (3 tasks, 2-stage review каждый).

---

## 6. Задокументированные гипотезы (не реализовано)

### Гипотеза C: MenuBar + Background Monitoring

Идея: фоновый мониторинг состояния xkeen через MenuBar icon с периодическим опросом. Цветной индикатор (зелёный/красный), быстрые действия из MenuBar.

Задокументирована для будущей реализации.

---

## Коммиты

```
00138ad feat(quick-add): add entry type selector dropdown
69f00b8 feat(routing): add entry type helpers and normalizeKeywordToken
967334d chore: delete unused src/ssh.ts
d427666 fix: resolve build and lint issues
ffe6455 refactor: rewrite main component, delete old monolith
e151a30 feat: add QuickAddForm with category dropdown
b6c2bb5 refactor: extract JsonEditor with comment preservation
738ea15 refactor: extract straight-port components from monolith
c34f1f5 feat: add lib/routing.ts with category parsing
f4a6627 refactor: extract lib/health.ts with combined startup call
68a2dc0 refactor: extract lib/profiles.ts from monolith
cff27ea refactor: extract lib/files.ts from monolith
71b9109 refactor: extract lib/json.ts from monolith
343b8bd refactor: extract lib/ssh.ts from monolith
dc7149b refactor: extract lib/utils.ts from monolith
d08cb24 initial: copy of xkeen-manager for v2 refactor
```

---

## Используемые skills

| Skill | Где применялся |
|-------|---------------|
| superpowers:brainstorming | Начальный анализ, генерация идей улучшений |
| superpowers:writing-plans | Планы рефакторинга и Entry Type фичи |
| superpowers:subagent-driven-development | Реализация обоих планов (рефакторинг + Entry Type) |
| superpowers:systematic-debugging | Диагностика 3 багов после тестирования |
| superpowers:requesting-code-review | Ревью спеки и плана |
