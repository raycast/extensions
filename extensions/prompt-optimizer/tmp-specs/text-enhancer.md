# Text Improver (Raycast extension) — спецификация (черновик)

## 0. Контекст

В расширении сейчас есть одна команда: **Optimize Prompt**. Данная фича добавляет вторую команду и workflow, ориентированный на улучшение _произвольного текста_ (сообщения, заметки и т. п.) без искажения смысла.

## 1. Продуктовое видение и цель

Цель фичи — дать пользователю универсальный и предсказуемый инструмент для улучшения произвольного текста без искажения смысла.

Базовый пользовательский сценарий:

**Исходный текст → [Text Improver] → улучшенный текст**

### 1.1 Принципы по умолчанию

Если пользователь **не задал дополнительную инструкцию и не выбрал тон**, оптимизатор работает в максимально нейтральном режиме:

- исправление орфографии, грамматики и пунктуации;
- повышение читаемости (упрощение формулировок, лёгкая структуризация);
- сохранение исходного тона и регистра;
- отсутствие стилистических «улучшений ради улучшений».

## 2. Не-цели

- Это не оптимизация промптов для агентов.
- Это не генерация контента: нельзя добавлять новые факты, идеи, утверждения или аргументы сверх уже имеющихся.
- Это не глубокий «переписанный заново» текст в другом жанре; поведение по умолчанию — аккуратная правка, а не переавторинг.

## 3. Определение: «сделать текст лучше без искажения смысла»

Оптимизатор ОБЯЗАН:

1. Сохранять семантику и исходное намерение.
2. Сохранять фактическое содержание (без добавления новых фактов и без удаления существенных).
3. Улучшать форму и подачу текста.

### 3.1 Правила сохранения смысла

- Все именованные сущности, числа, даты, ссылки, код, идентификаторы и пользовательские цитаты должны сохраняться, если пользователь явно не попросил их изменить.
- Если в тексте есть двусмысленность, следует устранять её только за счёт минимального переформулирования _без добавления предположений_. Если для прояснения требуется новая информация — двусмысленность должна быть сохранена.
- Нельзя менять позицию автора или степень уверенности (например, «возможно» → «точно»), если это не очевидная ошибка.

### 3.2 Критерии качества (что значит «лучше»)

Оптимизатор ДОЛЖЕН улучшать:

- **Корректность:** орфография, грамматика, пунктуация.
- **Ясность:** более простые конструкции, меньше неоднозначности, явные ссылки вместо «это/то», когда это безопасно.
- **Краткость:** удаление воды, повторов и тавтологий при сохранении смысла.
- **Читаемость:** короткие абзацы, логичный порядок, уместные разделители.
- **Тон (опционально):** дружелюбный / нейтральный / формальный и т. п.
- **Единый регистр:** отсутствие случайного смешения разговорного и формального стилей.
- **Прагматику чата:** понятный контекст, чёткий запрос, минимальное трение для получателя.

### 3.3 Ограничения на вывод

- На выходе должна быть одна улучшенная версия текста (без анализа и без альтернатив), если пользователь явно не запросил варианты.
- Нельзя добавлять «ассистентское» обрамление («Конечно, вот…»), заголовки или списки, если они не присутствуют в исходном тексте или явно не запрошены.

## 4. UX: команда и workflow

ВАЖНО: UX должен быть максимально похож на существующий **Prompt Optimizer** для снижения когнитивной нагрузки и обучения пользователя. внимательно изучите текущий UX перед реализацией.

### 4.1 Название команды

**Improve Text** (рабочее название).

### 4.2 Общий UX-подход

UX должен быть максимально близок к существующему **Prompt Optimizer**:

- схожая структура экрана;
- минимальное количество обязательных полей;
- фокус на быстром результате;
- возможность повторного запуска (retry) без повторного ввода текста.

### 4.3 Основной сценарий

1. Пользователь открывает команду.
2. Вводит или вставляет **исходный текст**
3. Опционально:
   - добавляет **дополнительную инструкцию агенту**;
   - выбирает **тон**;
   - настраивает форматирование.

4. Запускает оптимизацию.
5. Видит экран предпросмотра **улучшенного текста**.
6. Может:
   - скопировать результат;
   - выполнить **retry** (повторную оптимизацию с теми же параметрами).

### 4.4 Поля формы

**Обязательные:**

- **Исходный текст** (многострочное поле).

**Опциональные:**

- **Дополнительная инструкция** — свободный текст, который агент ОБЯЗАН учитывать (например: «сделать дружелюбнее», «максимально кратко»).
- **Тон** (dropdown, по умолчанию не выбран).
- **Настройки форматирования** (advanced / свернуты):
  - **Отключить agent-style форматирование**.

## 5. Тон текста

Варианты тона:
	1.	neutral — нейтральный, без эмоциональной окраски
	2.	professional — деловой, официальный
	3.	friendly — дружелюбный, мягкий
	4.	formal — формально-официальный (строже, чем professional)
	5.	informal — неформальный, разговорный
	6.	concise — сдержанный, лаконичный
	7.	polite — вежливый, тактичный
	8.	confident — уверенный, прямой, без смягчений

По умолчанию тон не используется – тогда оптимизатор будет сохранять тон исходного сообщения и не пытаться его 


#### 6.1 «Отключить agent-style форматирование» — область действия

При включённой опции оптимизатор ОБЯЗАН избегать:

- Длинных em-dash (—), если во входном тексте используются дефисы (-) или en-dash (–).
- «Умных кавычек» (« », “ ”), если во входном тексте используются прямые кавычки (" ').
- Символа многоточия (…); предпочтение трём точкам (...).
- Неразрывных, тонких и других специальных пробелов.
- Декоративных маркеров списков (•), если во входном тексте используются '-' или '\*'.
- Автоматической типографской нормализации, выходящей за рамки стиля входного текста.

При этом оптимизатор МОЖЕТ исправлять явно некорректную пунктуацию _в рамках того же типографского семейства_.

## 7. Контракт поведения модели (для реализации агентом)

### 6.1 Обязанности system prompt

Я уже написал подробный system prompt для этой задачи:
Ничего не придумывай а используй его как есть, 1-1

---

## start of system prompt

```
You are the **Text Improver** agent, designed to carefully improve user-provided text without distorting its meaning.

Your task is to receive a JSON input containing user text and return an improved version of that text, strictly following the rules below.

---

## General Editing Rules

1. Fix spelling, typos, grammar, and punctuation errors.
2. Improve clarity and readability by simplifying wording or sentence structure when necessary, without changing the meaning.
3. By default, work conservatively and apply only changes that are truly necessary.
4. **Preserve the original meaning, facts, intent, and structure of the message.**
5. **The improved text must correspond to the original message**, conveying the same content, requirements, and intent in a cleaner and more readable form.
6. Preserve the original tone and style unless explicitly instructed otherwise.
7. Do not add new facts, ideas, opinions, or conclusions.
8. Do not remove important details, requirements, or clarifications.

---

## Input Contract

Input is always provided as a JSON object with the following structure:

```

{
"sourceText": "string",
"instructions": "string | null",
"tone": "string | null",
"disableAgentStyleFormatting": "boolean"
}

```

Rules:
- `sourceText` is always present and contains the user’s original text.
- `instructions` and `tone` may be absent or null.
- `disableAgentStyleFormatting` defaults to false if not provided.
- The agent must not expect any additional fields.

---

## Instructions and Tone

- The `instructions` field contains additional user instructions and MUST be followed if provided.
- The `tone` field specifies the desired tone of the text (e.g. friendly, neutral, professional).
- Tone is an additional stylistic instruction and affects wording, vocabulary, and politeness level only.
- If both `instructions` and `tone` are provided:
  - `instructions` take priority;
  - `tone` acts as a stylistic constraint;
  - neither may change meaning or facts.
- If neither `instructions` nor `tone` is provided, PRESERVE the original tone, DO NOT try to invent a new one.

---

## Formatting Rules

- Preserve the original formatting where possible.
- Never add explanations, comments, or meta text.
- Always respond in the same language as `sourceText`.
- Do not change dialect or language variant.

### Agent-style Formatting

If `disableAgentStyleFormatting = true`:
- avoid smart quotes;
- avoid em dashes;
- use `-` instead of typographic dashes;
- use `...` instead of the ellipsis character;
- avoid non-breaking or special spaces;
- use a simple, neutral formatting style.

---

## Non-interpretable Input

If `sourceText` is not an interpretable, meaningful human-language text (random characters, no structure or intent):
- return `sourceText` unchanged;
- do not attempt to interpret or rewrite it;
- when in doubt, make no changes.

---

## Behavioral Constraints

You must not:
- refuse execution;
- ask clarifying questions;
- return multiple variants;
- return anything outside the JSON format.

---

## Output Format

Always return the result strictly in the following JSON format:

```

{
"ok": true,
"improvedText": "<string containing the improved text>"
}

```

Rules:
- `ok` is always true.
- `improvedText` always contains the final improved version.
- No additional fields.
- No text outside the JSON.

Remember: your goal is to subtly improve the text while preserving its meaning, structure, and intent.
```

---

## end of system prompt

### 6.2 Формирование входных данных

Во вход модели должны передаваться:

- Исходный текст без изменений.
- Опциональная дополнительная инструкция пользователя.

### 6.3 Выходные данные

- Только улучшенный текст, без вступлений и комментариев.

## 8. Критерии приёмки

- Для чернового сообщения результат исправляет ошибки и повышает ясность.
- Смысл и фактическое содержание сохраняются (без добавления новых фактов и без потери требований).
- При включённой опции отключения agent-style форматирования типографика остаётся в стиле исходного текста.
- Дополнительная инструкция влияет на тон и стиль, но не может нарушать сохранение смысла.

## 9. Заметки для будущих итераций (не входят в первый scope)

- Несколько вариантов текста (например, нейтральный и дружелюбный) за один запуск.
- Подсветка различий (diff).
- Пресеты и правила для конкретных языков.
