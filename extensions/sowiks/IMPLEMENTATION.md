# Sowiks → Raycast Store

План імплементації.

## Прогрес

Гілка в `sowiks_mac`: `raycast-url-scheme` (від `main`, скасовується видаленням гілки).

| Крок                              | Статус                |
| --------------------------------- | --------------------- |
| 4.1 Реєстрація схеми в Info.plist | ✅ **DONE**           |
| 4.2 Роутер як окремий фасад       | ✅ **DONE**           |
| 4.3 Черга при холодному старті    | ✅ **DONE**           |
| 4.4 Згода на зовнішнє керування   | ✅ **DONE**           |
| 4.5 Реліз 2.0.6                   | ⏸ чекає ручного тесту |
| 5.1 Скелет розширення             | ✅ **DONE**           |
| 5.2 Команди                       | ✅ **DONE**           |
| 5.3 Ассети                        | 🟡 іконка є, скриншоти вручну |
| 7. Реліз і подача                 | 🔄 в процесі          |
| 5.4 Подача PR                     | 🟡 чекає скриншоти + реліз апки |
| 6. AI Extension                   | ⬜ опційно            |

---

## 0. Де живе цей репозиторій

Важливо не переплутати три різні місця:

| Що                        | Де                                          | Публічне?   |
| ------------------------- | ------------------------------------------- | ----------- |
| Цей репозиторій           | `~/Downloads/sowiks_raycast`                | ні, робочий |
| Канонічний дім розширення | `raycast/extensions` → `extensions/sowiks/` | так         |
| Сторінка в Store          | `raycast.com/<raycast-username>/sowiks`     | так         |

**Сторінка розширення посилається на монорепо `raycast/extensions`, не на цей репозиторій.** Raycast не хостить сторонні репо — код розширення фізично живе в їхньому монорепо, і саме туди йдуть усі майбутні правки через PR.

Цей репозиторій потрібен для іншого: тут ведеться розробка й історія до першого PR, тут лежить цей документ, і тут зручно тримати чернетки скриншотів та іконок. Робочий цикл після мерджу: правиш тут → копіюєш папку в свій форк `raycast/extensions` → PR.

Пов'язані репозиторії: `~/Downloads/sowiks_mac` (клієнт, Фаза 1 робиться там), `~/Downloads/sowiks` (веб), `~/Downloads/sowiks_chrome`.

---

## 1. Навіщо

Прямі конкуренти в Raycast Store вже є і збирають трафік:

| Розширення  | Автор                                           | Інсталів |
| ----------- | ----------------------------------------------- | -------- |
| CleanShot X | Aayush9029 — стороння людина, не компанія       | 106 958  |
| Shottr      | fernando_barrios — стороння людина, не компанія | 11 423   |

raycast.com має DR 81. Подача повністю відкрита: PR у публічний монорепо, партнерка з Raycast не потрібна. Те, що обидва конкурентні розширення написали не власники продуктів, — найкращий доказ, що бар'єру немає.

Відкривати код Sowiks не треба. Open source вимагається тільки для коду розширення, а це тонка обгортка: кожна команда — 4-6 рядків, які роблять `open("sowiks://...")`. Уся логіка й весь пейволл лишаються в закритій Mac-апці.

---

## 2. Модель

```
Raycast command  ──open("sowiks://capture-area?src=raycast", "com.goliney.sowiks")──▶  Sowiks.app
                                                                                          │
                                                                          URLCommandRouter ▼
                                                                          TrialGate.allow(...)
                                                                            │            │
                                                                        allow          blocked
                                                                            ▼            ▼
                                                                      оверлей      UpgradePrompt
```

Зв'язок односторонній і сліпий: Raycast ніколи не дізнається, чи юзер заплатив, і не бере участі в оплаті. Платних розширень у Raycast Store не існує взагалі — комісії, revenue share і білінг-інтеграції немає. Розширення = ярлик.

Наслідок: зміна ціни, перехід з разової покупки на підписку, переїзд з Mac App Store на прямий продаж, зміна довжини тріалу, перенесення фічі між тарифами — **нічого з цього не змінює код розширення і не потребує нового PR.**

---

## 3. Таблиця команд

Єдине джерело правди для мапінгу. Гейти звірені з кодом `sowiks_mac`.

| Raycast command          | URL host             | Дія в апці                                           | Гейт                            | Де гейт                             |
| ------------------------ | -------------------- | ---------------------------------------------------- | ------------------------------- | ----------------------------------- |
| Capture Area             | `capture-area`       | `ScreenCaptureManager.captureSelectedArea()`         | `pro(.areaCapture)`             | `ScreenCaptureManager.swift:21`     |
| Capture Fixed Size       | `capture-fixed-size` | `captureFixedSizeArea()`                             | `pro(.fixedSizeCapture)`        | `ScreenCaptureManager.swift:30`     |
| Capture Fullscreen       | `capture-fullscreen` | `FullScreenCaptureService.captureFullScreen()`       | `pro(.fullScreenCapture)`       | `FullScreenCaptureService.swift:27` |
| **Capture Window**       | `capture-window`     | `WindowCaptureService.captureActiveWindow()`         | **free назавжди**               | `WindowCaptureService.swift:40`     |
| Capture Text (OCR)       | `capture-text`       | `OCRCaptureService.captureSelectedAreaForOCR()`      | `pro(.ocr)`                     | `OCRCaptureService.swift:20`        |
| Scrolling Capture        | `capture-scrolling`  | `ScreenCaptureManager.captureScrollingArea()`        | `pro(.scrollingCapture)`        | `ScreenCaptureManager.swift:39`     |
| Self-Timer Capture       | `self-timer`         | `TimerCaptureService.captureSelectedAreaWithTimer()` | `pro(.timerCapture)`            | `TimerCaptureService.swift:31`      |
| Screenshot Collection    | `capture-collection` | `ScreenCaptureManager.captureForCollection()`        | `pro(.collection)`              | `ScreenCaptureManager.swift:50`     |
| Toggle Screen Recording  | `record-screen`      | start/stop toggle                                    | `pro(.videoRecording)`          | `VideoRecordingService.swift:109`   |
| Pause / Resume Recording | `pause-recording`    | `pauseRecording()` / `resumeRecording()`             | немає — діє лише під час запису | —                                   |
| Unpin All                | `unpin-all`          | `PinManager.unpinAll()`                              | немає                           | —                                   |
| Open Settings            | `open-settings`      | `showPreferences()`                                  | немає                           | —                                   |
| Open Dashboard           | —                    | відкриває `app.sowiks.com/dashboard`                 | —                               | —                                   |
| Manage Integrations      | —                    | відкриває `app.sowiks.com/dashboard/connect`         | —                               | —                                   |

14 команд, 12 URL-хостів. Дві останні — звичайні веб-лінки, схема їм не потрібна.

`Capture Window` — єдина команда, що ніколи не впирається в пейволл. Вона має бути в розширенні обов'язково: це жива точка входу для того, хто не купив, і він може роками користуватись нею та бачити бренд.

---

## 4. Фаза 1 — URL API в Mac-апці

Робиться в `~/Downloads/sowiks_mac`. Порядок обов'язковий: **спершу реліз апки, потім PR у Raycast.** Розширення без апки-носія — це 14 команд, які нічого не роблять.

### 4.1 Реєстрація схеми — і податок, який лишиться назавжди

> ✅ **DONE** — коміт `7e00336`. Файл лежить у `Config/Info.plist`, **не** в `Sowiks/`: та папка є синхронізованою групою Xcode 16 (`PBXFileSystemSynchronizedRootGroup`), і plist усередині неї потрапив би ще й у ресурси бандла.
>
> Мердж перевірено на реальній збірці: діф зібраного `Info.plist` проти еталона до змін **суто адитивний, 0 видалених рядків**. `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, `LSApplicationCategoryType`, `ITSAppUsesNonExemptEncryption` на місці, `CFBundleURLSchemes:0 = sowiks` додано.

Зараз `GENERATE_INFOPLIST_FILE = YES` без `INFOPLIST_FILE`: увесь конфіг Info.plist живе в `project.pbxproj` як `INFOPLIST_KEY_*` (камера, мікрофон, категорія). Для `CFBundleURLTypes` ключа `INFOPLIST_KEY_*` не існує, тому потрібен реальний файл.

План: створити `Sowiks/Info.plist` **тільки** з `CFBundleURLTypes` (scheme `sowiks`, role `Editor`), виставити `INFOPLIST_FILE = Sowiks/Info.plist` для обох конфігурацій таргета Sowiks (`project.pbxproj` ~404 і ~435), `GENERATE_INFOPLIST_FILE` лишити `YES` — Xcode 13+ мержить частковий файл зі згенерованим.

> ### ⚠️ ПОДАТОК, ЯКИЙ ТРЕБА ТРИМАТИ В ГОЛОВІ
>
> **Після цієї зміни конфіг Info.plist живе у ДВОХ місцях.**
>
> Раніше було одне: `INFOPLIST_KEY_*` у `project.pbxproj`. Тепер додається `Sowiks/Info.plist`.
>
> Що з цим робити далі:
>
> - Новий ключ Info.plist додавай у `project.pbxproj` як `INFOPLIST_KEY_*`, як і раніше. Файл тримай мінімальним — **тільки** `CFBundleURLTypes`, більше туди нічого не класти.
> - Xcode UI за замовчуванням пише в **файл**, а не в build settings. Якщо колись додаси ключ через Target → Info, перевір, куди він потрапив, і перенеси в `project.pbxproj`.
> - Мердж перевіряти не на Debug-збірці, а на archive: `plutil -p Sowiks.app/Contents/Info.plist` після `xcodebuild archive`. Debug і Release можуть поводитись по-різному, і саме archive іде в стор.
> - Якщо колись побачиш, що зникли `NSCameraUsageDescription` чи `NSMicrophoneUsageDescription` — перше, що перевіряти, це цей мердж. Апка без цих ключів падає на першому доступі до камери.

### 4.2 Роутер як окремий фасад

> ✅ **DONE** — коміт `c9d6e61`. `Sowiks/Services/URLCommandRouter.swift` + 11 тестів у `SowiksTests/URLCommandRouterTests.swift`, усі проходять.
>
> Розбір URL винесений у чисту `URLCommandRouter.resolve(_:) -> URLCommandResolution` за зразком `TrialDecision`, тому вся таблиця істинності тестується без вікна й без капчура. Тести фіксують саме те, що ламається тихо: унікальність хостів, `?src=` не міняє команду, `auth`/`oauth`/`callback` → `.reserved`, невідомий хост → `.unknown` без алерта, і що `uploadShareLink` **не** виставлений назовні (він editor-scoped і з Raycast не має фокусу).

`ScreenshotShortcutService.executeScreenshotFunction(_:)` (`ScreenshotShortcutService.swift:460`) — уже готовий диспетчер «запустити функцію ззовні меню», яким користуються глобальні хоткеї. Але він покриває лише 8 із 12 хостів: немає `capture-collection`, `pause-recording`, `unpin-all`, `open-settings`. Ці чотири живуть тільки як приватні `@objc` методи AppDelegate.

Не мішати два шляхи диспетчеризації. Замість цього — новий `Sowiks/Services/URLCommandRouter.swift`:

- `enum ExternalCommand: String` з 12 кейсами, rawValue = URL host. **Це і є публічний контракт.**
- Для восьми, що збігаються — делегувати в `executeScreenshotFunction` (зробити його `internal`). Тоді URL і хоткей ходять одним шляхом і поведінка не розповзеться.
- Для решти чотирьох — прямі виклики сервісів (`ScreenCaptureManager.captureForCollection()`, `VideoRecordingService.pause/resumeRecording()`, `PinManager.unpinAll()`, `showPreferences()`).
- `uploadShareLink` НЕ виставляти: він editor-scoped, вимагає `NSApp.keyWindow as? EditorWindow`, а виклик з Raycast прийде без фокусу в редакторі.

**Зарезервовані хости:** `auth`, `oauth`, `callback` — роутер їх ігнорує явним кейсом, а не «випадає в default». Невідомий хост — тихий no-op без алерта: Raycast може бути новіша за апку.

Хук у `SowiksApp.swift`: `func application(_ application: NSApplication, open urls: [URL])`. `@NSApplicationDelegateAdaptor(AppDelegate.self)` уже підключений (`SowiksApp.swift:17`), тож метод викликатиметься.

Реентрантність частково вже є: `VideoRecordingService.startRecordingFlow` має `guard !isRecording, controlBar == nil`, `pauseRecording` має `guard isRecording, !isPaused`. Для капчур-команд додати захист від подвійного виклику, поки оверлей виділення активний.

### 4.3 Черга при холодному старті

> ✅ **DONE** — коміт `b941df2`. Черга в `URLCommandRouter`, звільняється з `URLCommandRouter.appDidFinishLaunching()` в кінці `applicationDidFinishLaunching`.
>
> Свідомо чекаємо **лише** на синхронну частину запуску. Чекати на entitlements не можна: вони їдуть мережею, а `TrialGate.allow` синхронний за задумом — тримати капчур заради раунд-тріпу означало б зламати те, що цей задум і захищає. Платного юзера тим часом покриває кешований план і `mayUseProFeatures`, що fail-open на невідомому.

Якщо Sowiks не запущена, URL підніме апку — і команда може прийти раніше, ніж ініціалізуються `DeviceTrialService`, `StoreKitService`, `SessionManager`. Тоді `TrialGate` ухвалить рішення на порожньому стані й може показати пейволл платному юзеру.

Роутер має ставити команду в чергу, якщо ініціалізація не завершена, і виконувати її після. Один `pending: ExternalCommand?`, що спорожнюється в кінці `applicationDidFinishLaunching`.

### 4.4 Згода на зовнішнє керування

> ✅ **DONE** — коміт `785084d`. `Sowiks/Services/ExternalControlConsent.swift` + секція «Automation» в `IntegrationsPreferencesView`.
>
> Реалізовано як два окремі стани: `isEnabled` (перемикач, default ON) і `hasBeenAsked` (одноразовий алерт при найпершій зовнішній команді, з назвою команди в тексті). Додатково — вимкнений стан більше не мовчить: замість тиші йде нотифікація «External control is off», бо саме тиша й зробила цю настройку такою заплутаною в CleanShot X.

Тумблер у `IntegrationsPreferencesView.swift`, секція «Automation», `@AppStorage`, **default ON**. Плюс **одноразовий діалог згоди при найпершій зовнішній команді**: Allow / Not now, вибір запам'ятовується.

Чому саме так, а не як у CleanShot X. У них перемикач default OFF, і це їхня найчастіша скарга — ішюси [#9258](https://github.com/raycast/extensions/issues/9258), [#9383](https://github.com/raycast/extensions/issues/9383), [#10520](https://github.com/raycast/extensions/issues/10520) усі про «команди не відкривають апку». Default OFF ламає перше враження. Але чистий default ON має дві реальні діри:

- будь-яка апка чи вебсторінка може смикнути `sowiks://record-screen` у тула, який уже має дозвіл на запис екрану;
- `capture-fullscreen` спрацьовує без жодної взаємодії, а тріал стартує на першому вдалому знімку — тобто чужий URL може непомітно спалити старт 7-денного клоку. Це вже не безпека, а сапорт-інцидент і привід для рефанду.

Одноразова згода закриває обидві й коштує один клік, який юзер усе одно бачить у момент, коли сам щойно натиснув команду в Raycast.

`?src=raycast` — **виключно телеметрія**. Ніколи не використовувати для дозволів, тарифікації чи allowlist: підставити його може будь-хто. Якщо значення поїде в аналітику — звірити з App Privacy disclosure.

Логувати команди для сапорту можна, але ніколи не логувати повний URL хоста `auth`: там `?token=`.

### 4.5 Реліз

> ⏸ **Чекає ручного тесту. Бамп версії не потрібен** — перевірено по App Store Connect 21.08.2026:
>
> | | |
> |---|---|
> | Жива в сторі | 2.0.5, build 16, реліз 20.08 |
> | 2.0.6 у Connect | не існує — ні в рев'ю, ні чернеткою |
> | У репозиторії | 2.0.6 / build 17 — вільні й валідні |
>
> Тобто 2.0.6 ніколи не відвантажувалась, і може нести схему. Мінімальна версія в розширенні — `2.0.6`.
>
> **Release-конфігурація перевірена окремо** (Archive бере саме її, а не Debug): `CFBundleURLSchemes:0 = sowiks`, при цьому `CFBundleShortVersionString`, `CFBundleVersion`, `NSCameraUsageDescription`, `NSMicrophoneUsageDescription` на місці.
>
> **Пастка з гілкою:** Xcode архівує те, що викладено в робочій теці. Порядок — тест на `raycast-url-scheme` → мердж у `main` → Archive з `main`, щоб продакшен збігався з основною гілкою.
>
> 2.0.6 несе не лише цю роботу: у `main` уже є зміни, зроблені після 2.0.5. Release notes писати на весь обсяг.

---

## 5. Фаза 2 — розширення

### 5.1 Скелет

> ✅ **DONE** — `package.json`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc` за зразком розширень, змерджених цього тижня. `npm run build` і ESLint/Prettier проходять.
>
> **Версія API:** взято `@raycast/api ^1.104.25`, а не `2.0.3`, який npm віддає як `latest`. 2.0.3 вийшов 19.08.2026, тобто два дні тому, і монорепо на нього ще не перейшло — усі розширення, змерджені цього тижня, сидять на 1.104.x. Свіжий мажор на першій подачі — зайве тертя на рев'ю. Переглянути, коли монорепо перейде.

`npm init raycast-extension` у цьому репозиторії.

> ### ⚠️ СКЕЛЕТ, ЯКИЙ ТРЕБА ТРИМАТИ В ГОЛОВІ
>
> Ці поля `package.json` не косметика — на них дивиться автоматика Raycast і рев'ювер. Зламаєш одне з них при майбутньому апдейті — PR не пройде:
>
> ```jsonc
> {
>   "name": "sowiks", // = ім'я папки в extensions/, змінити вже не можна
>   "title": "Sowiks",
>   "author": "<raycast-username>", // юзернейм акаунта Raycast, НЕ GitHub-нік
>   "license": "MIT", // обов'язково саме MIT
>   "platforms": ["macOS"],
>   "categories": ["Applications", "Productivity"],
>   "commands": [/* кожна: name = ім'я файлу в src/, mode: "no-view" */],
> }
> ```
>
> - `author` мусить бути юзернейм **Raycast**, і з нього збирається публічний URL `raycast.com/<author>/sowiks`. Реєструвати акаунт під брендовим ім'ям, не під випадковим ніком.
> - `name` намертво прив'язаний до шляху `extensions/sowiks/` у монорепо. Перейменування = нове розширення з нуля, з втратою лічильника інсталів.
> - `package-lock.json` **комітити обов'язково**.
> - Перед кожним PR: `npm run build` **і** `npm run lint`. Build робить додаткову перевірку типів, якої немає в dev.
> - Кожен наступний апдейт — новий запис у `CHANGELOG.md` з h2-заголовком і плейсхолдером `{PR_MERGE_DATE}`.
> - Апати `@raycast/api` при кожному апдейті: рев'ю вимагає свіжу версію API.

### 5.2 Команди

> ✅ **DONE** — 14 файлів у `src/`, спільний хелпер `src/lib/sowiks.ts`. Порядок `detect → version → close → open` реалізований саме там, тому 12 командних файлів мають по 5 рядків кожен.
>
> Перевірку версії зроблено через `/usr/bin/plutil -extract CFBundleShortVersionString` — зібраний `Info.plist` це бінарний plist, текстом його не розібрати. Будь-яка помилка читання → `undefined` → команда виконується: відмовити через нечитану версію гірше, ніж пропустити.

По файлу `src/<command>.ts` на кожен хост, усі `mode: "no-view"`, `subtitle: "Sowiks"` (індексується пошуком Raycast).

Наївний патерн CleanShot X — `closeMainWindow()` одразу, потім `open()` — має баг: якщо апки немає, вікно Raycast уже закрите й юзер не побачить помилки. Правильний порядок:

```ts
// 1. знайти апку   2. перевірити версію   3. закрити Raycast   4. відкрити URL
const app = (await getApplications()).find((a) => a.bundleId === "com.goliney.sowiks");
if (!app) return showToast({ style: Toast.Style.Failure, title: "Sowiks is not installed", ... });
await closeMainWindow();
await open("sowiks://capture-area?src=raycast", "com.goliney.sowiks");
```

**Другий аргумент `open()` обов'язковий.** URL-схеми в macOS глобальні й не мають власника — інша апка може зареєструвати `sowiks`, і Launch Services відкриє її. Передача bundle id прибиває хендлер до `com.goliney.sowiks` і знімає цей ризик повністю. Сигнатура: `open(target: string, application?: Application | string)`.

Тост про відсутню апку має екшен «Download Sowiks» → sowiks.com. Без нього людина, що знайшла розширення в Store раніше за апку, впирається в тишу — це глухий кут замість завантаження, і саме звідси частина скарг на CleanShot X.

**Перевірка мінімальної версії.** `getApplications()` підтверджує лише наявність bundle id, але не підтримку команд: на 2.0.x URL прилетить у нікуди й апка мовчки нічого не зробить. Читати `CFBundleShortVersionString` з `<app.path>/Contents/Info.plist` і за версією < 2.1.0 показувати тост «Update Sowiks to 2.1.0 or later». Винести в один хелпер `src/lib/sowiks.ts`, щоб не дублювати у 12 файлах.

### 5.3 Ассети

> 🟡 **Частково** — іконка, README і CHANGELOG зроблені; `ray lint` окремо підтвердив `validate extension icons` і `validate extension metadata`.
>
> **Лишилось вручну: 3-6 скриншотів у `metadata/`.** Публікувати розширення для цього не треба — `npm run dev` кладе його в локальну Raycast одразу, з усіма командами.
>
> Знімає їх сама Raycast, різати руками нічого не потрібно:
> 1. Raycast → Settings → Advanced → **Window Capture**, призначити гарячу клавішу
> 2. `npm run dev`
> 3. відкрити потрібну команду
> 4. натиснути клавішу, **поставити галку `Save to Metadata`**
>
> Window Capture прибирає з кадру dev-меню та іконки розробника і зберігає рівно 2000×1250 PNG у `metadata/`. Тільки світла тема — темну для стору не роблять.

- `assets/extension-icon.png` 512×512, читабельна на light і dark
- окремі іконки команд — у CleanShot X вони є, і список виглядає значно охайніше
- `metadata/` — 3-6 скриншотів рівно 2000×1250 PNG, спільний фон. Знімати самим Sowiks
- `README.md`: вимагає Sowiks для macOS ≥ 2.1.0; посилання на завантаження; **чесно написати, що розширення безкоштовне, а частина команд потребує активного тріалу або покупки в апці** — інакше буде негатив у відгуках і сапорті; `Capture Window` і редактор безкоштовні назавжди
- рядок про те, що назва й логотип Sowiks — торгова марка, і MIT покриває код розширення, а не брендові ассети
- `CHANGELOG.md`: `## [Initial Version] - {PR_MERGE_DATE}`

### 5.4 Подача

> 🟡 **Готово технічно, чекає на дві речі.**
>
> Автор: `Holiney` — акаунт створено, `ray lint` проходить повністю (`ray lint` валідує це поле живим запитом до `raycast.com/api/v1/users/<handle>`). Майбутній URL розширення: **`raycast.com/Holiney/sowiks`**.
>
> Лишилось до подачі: скриншоти в `metadata/` (§5.3) і реліз апки 2.1.0 (§4.5) — розширення не можна подавати раніше, ніж вийде версія, яка відповідає на схему.

`npm run build` + `npm run lint` → `npm run publish` (сам відкриває PR у твій форк і далі в `raycast/extensions`).

Що відбувається з PR автоматично (заміряно на живих PR, серпень 2026):

1. `raycastbot` вітає й попереджає: «initial review may take up to **15 business days**»
2. `greptile-apps` — автоматичне AI-рев'ю коду, пише summary і зауваження
3. живий рев'ювер з команди Raycast апрувить або просить правки
4. після мерджу `github-actions` публікує коментар із готовим лінком на `raycast.com/<author>/sowiks`
5. `raycastbot` нараховує кредити на Raycast-акаунт, які обмінюються на мерч

**Реальні строки** по вибірці нових розширень, змерджених у серпні 2026: медіана ≈ 17 днів, розкид від 1 години до 35 днів. Швидкі мерджі — це досвідчені контриб'ютори з десятками розширень; перша подача реалістично займе **2–4 тижні**.

PR стає stale після 14 днів **без активності з твого боку** і закривається після 21 — це лічильник від останнього коментаря, а не від віку PR. Тому головне — відповідати на зауваження вчасно, а не чекати швидкого першого контакту.

**Пропускна здатність монорепо:** 105 змерджених PR за останні 7 днів, з них кілька нових розширень щодня. Пайплайн живий, мораторію немає.

---

## 6. Фаза 3 — AI Extension (опційно, після мерджу)

`tools` + ключ `ai` у `package.json` дають «Take a scrolling screenshot with Sowiks» природною мовою і потрапляння в [категорію AI](https://www.raycast.com/store/category/ai), де скріншот-тулів майже немає.

Найдешевший варіант — обгорнути ті самі URL-команди як tools, без нового API. Повноцінні tools із поверненням даних (список останніх аплоадів, пошук по історії) потребують персональних API-токенів на `api.sowiks.com` — окрема серверна робота, у цей план не входить.

Тут же ламається головна перевага поточної схеми: щойно розширення почне **показувати дані**, знадобиться авторизація, і стан оплати вперше почне мати значення для розширення. Саме тому фаза опційна.

---

## 7. Постійні зобов'язання після релізу

Те, що не закінчується з мерджем PR.

**URL-схема стає публічним API назавжди.** Щойно розширення в Store, `sowiks://capture-area` не можна перейменувати — у людей встановлені старі версії розширення. `ExternalCommand.rawValue` — це контракт. Правила:

- імена хостів не змінюються ніколи; еволюція тільки через додавання query-параметрів, які старі клієнти можуть не слати
- версіонування виду `sowiks://v1/capture-area` **не робимо** — CleanShot і Shottr обходяться без нього, а адитивні параметри покривають майже всі майбутні зміни
- новий хост додавати вільно; видаляти — ніколи, максимум перетворити на no-op
- на `URLCommandRouter` потрібні юніт-тести: кожен хост → очікуваний `ExternalCommand`, невідомий → nil, зарезервовані → ignore. Це те, що ловить регрес при рефакторингу
- при кожному рефакторингу капчур-логіки перевіряти, що роутер досі відпрацьовує

**Коли зміна в апці вимагає PR у Raycast.** Оплата — ніколи. А ось це — так:

- видалив фічу зовсім → команда лишається висіти в Raycast, поки не подаси PR на видалення
- змінив умови тріалу чи назву тарифу → текст у README протух
- Raycast підняв вимоги до метаданих або зламав API → лінт у монорепо почне падати

**Власник.** Розширення в монорепо має автора й контриб'юторів. Ішюси прилітають у `raycast/extensions` із префіксом `[Sowiks]`. Без реакції Raycast лишає за собою право втрутитись у закинуте розширення. Треба свідомо тримати цей канал у полі зору — приблизно як стор-відгуки.

**Ритм.** Прив'язати перевірку розширення до релізного чеклиста Sowiks: новий реліз клієнта → чи не з'явились/зникли команди, чи актуальна мінімальна версія в README.

---

## 8. Верифікація

**Mac-апка:**

1. `open "sowiks://capture-area"` з термінала → оверлей виділення. Пройтись по всіх 12 хостах.
2. `open "sowiks://nonexistent"` → апка виходить на передній план, нічого не падає.
3. **Регрес авторизації:** вийти з акаунта → зайти через Google → перевірити, що логін проходить і токен не обмінюється двічі. Окремо: cold launch, warm launch, апка у фоні, скасована авторизація. Те саме для Apple Sign In. Це найризикованіше місце всієї фази.
4. **Холодний старт:** повністю вбити Sowiks → `open "sowiks://capture-fullscreen"` → команда виконується після ініціалізації, а не втрачається і не показує пейволл платному юзеру.
5. **Пейволл:** на протермінованому тріалі кожна платна команда з таблиці §3 показує `UpgradePrompt`, а не тихо нічого не робить. `capture-window` працює.
6. **Archive-збірка:** `plutil -p Sowiks.app/Contents/Info.plist` → присутні і `CFBundleURLTypes`, і `NSCameraUsageDescription`, і `NSMicrophoneUsageDescription`.
7. Реентрантність: двічі поспіль `record-screen`, `pause-recording` без активного запису, `unpin-all` коли нічого не закріплено.
8. Тести — тільки дотичний сьют, не весь `xcodebuild test`.

**Розширення:**

1. `npm run dev` → команди в Raycast → кожна відкриває свою дію.
2. Перейменувати Sowiks.app тимчасово → тост «not installed» з робочим посиланням.
3. Поставити 2.0.2 → тост «Update to 2.1.0».
4. `npm run build` і `npm run lint` без помилок.
5. Іконка в light і dark темі.
6. Після PR — зелені автоперевірки монорепо.

---

## 9. Що сказало незалежне рев'ю

План проганявся через GPT-5.5. Прийнято й вбудовано вище:

- порядок `detect → close → open` замість наївного патерну CleanShot X (§5.2)
- `open()` з bundle id проти захоплення схеми (§5.2)
- перевірка мінімальної версії апки (§5.2)
- черга команд при холодному старті (§4.3)
- одноразова згода замість чистого default ON, і ризик старту тріалу чужим URL (§4.4)
- окремий фасад роутера замість домішування приватних методів AppDelegate (§4.2)
- явно зарезервовані хости `auth`/`oauth`/`callback` (§4.2)
- перевірка мерджу Info.plist на archive, а не на Debug (§4.1)
- потабличний аудит гейтів по кожній команді (§3)
- трейдмарк-застереження в README при MIT-ліцензії (§5.3)
- чесний опис пейволу в README (§5.3)
- юніт-тести роутера і план супроводу (§7)

Відхилено:

- **версіонування URL виду `sowiks://v1/...`** — ні CleanShot X, ні Shottr так не роблять, це шум в API, а адитивні query-параметри покривають реалістичні сценарії еволюції. Ціна помилки низька: якщо колись справді знадобиться, старі хости лишаються, а нові додаються з префіксом.
- **«ризик для Mac App Store через default ON»** — переоцінено. URL-схеми має величезна частка апок у MAS, це не предмет рев'ю Apple. Реальні ризики для MAS — зовнішні платіжні лінки й обхід IAP, і їх у плані немає за побудовою.
- **«розширення виглядатиме як набір thin launcher commands»** — це і є жанр, у якому CleanShot X зібрав 107k інсталів. Вимоги до якості закриваються ассетами й README з §5.3.

---

## 7. Реліз і подача

Два треки. Скриншоти не залежать від App Store і робляться паралельно рев'ю Apple.

```
Submit → апрув → реліз → перевірити 2.0.6 жива → npm run publish → рев'ю Raycast → мердж
                    ↑
        скриншоти паралельно тут
```

### 7.1 App Store

Стан на 21.08.2026: версія 2.0.6 створена в Connect (00:55), білд 17 підчеплений, `releaseType = AFTER_APPROVAL` — тобто автоматичний реліз одразу після апруву.

**Сабміт треба дотиснути у два кроки.** У Connect це «Add for Review», а потім на екрані огляду «Submit to App Review». Зупинка на першому кроці лишає версію в `PREPARE_FOR_SUBMISSION`, і сторінка при цьому виглядає завершеною.

Як перевірити, що сабміт справді пішов — два незалежні сигнали через ASC:
- стан версії має бути `WAITING_FOR_REVIEW`, а не `PREPARE_FOR_SUBMISSION`
- має з'явитися новий `reviewSubmission` зі свіжою датою

Рев'ю Mac-апок зазвичай 24-48 годин.

### 7.2 Перевірити, що версія жива

Після апруву й релізу — публічним запитом, без Connect:

```bash
curl -s "https://itunes.apple.com/lookup?id=6755901903" | grep -o '"version":"[^"]*"'
```

Має віддати `2.0.6`.

### 7.3 Подача в Raycast

**Тільки після того, як 2.0.6 жива в сторі.** Рев'ювер Raycast ставить апку і тисне команди; на 2.0.5 він побачить тост «Update Sowiks to 2.0.6 or later» і резонно поверне PR.

```bash
cd ~/Downloads/sowiks_raycast && npm run publish
```

Команда сама форкає `raycast/extensions`, копіює розширення в `extensions/sowiks/` і відкриває PR. Потрібна авторизація GitHub під `goliney-vasyl`.

Далі — цикл із §5.4: бот, Greptile, живий рев'ювер, лінк на `raycast.com/Holiney/sowiks`, кредити на мерч.

### 7.4 Release notes для 2.0.6

Версія несе не лише цю роботу. Після 2.0.5 у `main` увійшли: вкладка About у Preferences, посилання на privacy policy і terms звідти, спільне затемнення для кількох spotlight-ів. Керування через `sowiks://` варто ставити першим пунктом — це єдина зміна, яку користувач може захотіти.
