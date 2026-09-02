# Mealie-Raycast-Extension: Design

> 🤖 Diese Spec hat Data am 2026-09-01 auf Basis einer Verifikation gegen eine
> echte Mealie-Instanz (via MCP, nur lesend) erstellt und mit Joschka abgestimmt.

Status: abgestimmt am 2026-09-01
Nächster Schritt: Implementierungsplan (`writing-plans`)

---

## 1. Ziel

Eine Raycast-Extension, die die vier alltäglichen Mealie-Handgriffe ohne Browser
erledigt:

1. Einkaufslisten pflegen (CRUD)
2. Essensplan pflegen (CRUD)
3. Rezepte per URL importieren
4. Rezepte durchsuchen, mit Enter die Rezeptseite öffnen

Kernanforderung aus der Abstimmung: Beim Hinzufügen von Zutaten soll es eine
Auto-Completion über die **bestehenden** Mealie-Foods geben, weil an diesen die
Labels (Ladenkategorien) hängen. Freitext muss trotzdem möglich bleiben.

## 2. Nicht-Ziele

Bewusst ausgeschlossen, um den Umfang klein zu halten:

- Rezepte in Raycast anlegen oder bearbeiten (Import genügt)
- Pflege von Foods, Units, Labels, Tags, Kategorien als eigene Oberfläche
- Nährwerte, Bewertungen, Kommentare, Timeline
- Offline-Modus oder lokale Persistenz über den Raycast-Cache hinaus
- Mehrere Mealie-Instanzen oder Household-Wechsel zur Laufzeit

## 3. Verifizierte API-Grundlagen

Alle folgenden Aussagen stammen aus Live-Abfragen gegen die Zielinstanz am
2026-09-01, nicht aus der Doku. Konkrete IDs sind hier durch Platzhalter ersetzt,
weil dieses Repo öffentlich ist.

### 3.1 Instanz und Version

Die Antworten enthalten `householdId`, `recipeServings` und
`recipeYieldQuantity`. Diese Felder existieren erst ab Mealie 2.0, die Instanz
läuft also auf **Mealie >= 2.0**. Die exakte Patch-Version ist nicht erhoben.
Der Client wird deshalb tolerant gegenüber unbekannten Zusatzfeldern gebaut und
liest die Version beim ersten Start aus `GET /api/app/about` für die
Fehlerdiagnose.

### 3.2 Einkaufslisten

- `GET /api/households/shopping/lists` liefert die Listen des Haushalts.
- Jede Liste trägt `labelSettings`: ein Array aus `{ labelId, position, label }`.
  `position` ist die vom Nutzer festgelegte Ladenlauf-Reihenfolge, in der
  Referenzinstanz 19 Labels mit `position` 0 bis 18.
  **Konsequenz:** Items werden nach dieser Reihenfolge gruppiert, nicht
  alphabetisch.
- Items (`GET /api/households/shopping/items`) haben unter anderem:
  `id`, `shoppingListId`, `checked` (bool), `position` (int), `quantity` (number),
  `note` (string), `display` (berechneter Anzeigetext), `foodId`/`food`,
  `labelId`/`label`, `unitId`/`unit`, `recipeReferences`.
- Zwei Item-Sorten kommen in echten Daten vor:
  - **Food-Item:** `foodId` gesetzt, `note` leer, `label` aus dem Food.
  - **Freitext-Item:** `foodId: null`, `note` trägt den Text, `label` optional
    manuell gesetzt.
  Beide müssen unterstützt werden.

### 3.3 Foods und Labels

- 609 Foods in der Referenzinstanz.
- Gepflegte Foods haben ein Label: In einer Stichprobe von 25 älteren Einträgen
  hatten 23 ein `labelId` (Beispiel: Thymian -> „Obst, Gemüse, Nüsse & Co.").
- Zuletzt angelegte Foods haben häufig **kein** Label (`labelId: null`).
  **Konsequenz:** Die Auto-Completion zeigt an, ob ein Food ein Label hat, damit
  fehlende Kategorien sichtbar werden statt still unter „Sonstiges" zu landen.
- Ob Mealie das Label beim Anlegen eines Items serverseitig aus dem Food ableitet,
  ist **nicht verifiziert**. Der Client setzt `labelId` deshalb explizit aus dem
  gewählten Food mit. Das ist in beiden Fällen korrekt.
- Mealies Food-Suche ist token-basiert und findet „Basmatireis" nicht bei der
  Eingabe „Reis". **Konsequenz:** Gefiltert wird clientseitig, nicht per API.

### 3.4 Essensplan

- `GET /api/households/mealplans` mit `start_date`/`end_date` (ISO `YYYY-MM-DD`).
- Felder: `id` (**Integer**, nicht UUID), `date`, `entryType`, `title`, `text`,
  `recipeId`, eingebettetes `recipe`-Objekt.
- `entryType`: Die OpenAPI-Spec (geprüft am 2026-09-01) kennt sieben Werte:
  `breakfast`, `lunch`, `dinner`, `side`, `snack`, `drink`, `dessert`. In den
  Live-Daten der Zielinstanz war nur `dinner` belegt. Die Extension bietet alle
  sieben an; lehnt eine ältere Instanz einen Wert ab, zeigt der Fehler-Toast den Grund.
- Ein Eintrag ist entweder rezeptbasiert (`recipeId`) oder frei (`title`/`text`).
  Beides muss anlegbar sein.

### 3.5 Rezepte

- 269 Rezepte in der Referenzinstanz.
- Relevante Felder: `id`, `slug`, `name`, `description`, `image`, `orgURL`,
  `tags`, `recipeCategory`, `rating`, `lastMade`, `totalTime`.
- `orgURL` ist **häufig `null`**, auch bei importierten Rezepten. In den
  Stichproben war es bei 1 von 3 gesetzt.
  **Konsequenz:** Enter öffnet die Mealie-Rezeptseite (immer vorhanden), die
  Original-URL ist eine sekundäre Action, die nur erscheint, wenn `orgURL` gesetzt
  ist.
- `image` ist ein Token-String (z.B. vier Zeichen), `null`, oder der Literalwert
  `"no image"`. Alle drei Fälle müssen abgefangen werden, bevor eine Bild-URL
  gebaut wird.
- Import: `POST /api/recipes/create/url` nutzt Mealies serverseitigen Scraper.
  Nicht parsebare URLs liefern HTTP 400.

## 4. Commands

Fünf Commands. `Add to Shopping List` ist funktional in `Shopping Lists`
enthalten, existiert aber separat, weil er den häufigsten Vorgang auf zwei
Tastendrücke verkürzt. Das ist der eigentliche Mehrwert gegenüber der Weboberfläche.

| Command | Titel | Modus | Zweck |
|---|---|---|---|
| `search-recipes` | Search Recipes | view | Rezeptsuche, Enter öffnet die Mealie-Rezeptseite |
| `shopping-lists` | Shopping Lists | view | Listen und Items vollständig verwalten |
| `add-to-shopping-list` | Add to Shopping List | view | Schnellerfassung mit Food-Auto-Completion |
| `meal-plan` | Meal Plan | view | Wochenansicht des Essensplans, Einträge verwalten |
| `import-recipe` | Import Recipe | view | Rezept per URL importieren |

### 4.1 Search Recipes

- `List` mit serverseitiger Suche (`GET /api/recipes?search=`), debounced.
- Item zeigt Name, Beschreibung als Accessory, Tags/Kategorie als Accessory,
  Rezeptbild als Icon (nur wenn `image` ein echtes Token ist).
- Actions in dieser Reihenfolge:
  1. **Open in Mealie** (Enter): `<mealieUrl>/g/<groupSlug>/r/<slug>`
  2. Open Original Source (nur wenn `orgURL` gesetzt)
  3. Add to Shopping List (öffnet Listen-Auswahl, dann Mealies
     Recipe-to-List-Endpunkt)
  4. Add to Meal Plan (öffnet Datums- und Typ-Auswahl)
  5. Copy Recipe URL

Der `groupSlug` für die Rezept-URL wird einmalig aus `GET /api/users/self`
ermittelt und gecacht, statt ihn zu raten.

### 4.2 Shopping Lists

Zwei Ebenen:

**Ebene 1, Listenübersicht:** alle Listen mit Anzahl offener Items als Accessory.
Actions: Öffnen (Enter), Neue Liste, Umbenennen, Löschen (mit Bestätigung),
In Mealie öffnen.

**Ebene 2, Items einer Liste:** `List` mit `List.Section` je Label, sortiert nach
`labelSettings.position`. Items ohne Label kommen als letzte Sektion.
Abgehakte Items in einer eigenen, eingeklappten Sektion am Ende.
Actions: Abhaken/Wiederherstellen (Enter), Hinzufügen (öffnet den FoodPicker),
Bearbeiten (Menge, Einheit, Notiz, Label), Löschen, Alle abgehakten löschen.

### 4.3 Add to Shopping List

Ein `List`-Command, kein Formular. Ablauf:

1. Wenn mehr als eine Liste existiert: Zielliste wählen. Die zuletzt genutzte Liste
   wird in `LocalStorage` gemerkt und vorausgewählt.
2. Suchfeld tippen -> gefilterte Foods mit Label-Badge als Accessory.
3. Enter auf einem Food legt das Item an (`foodId` + `labelId` explizit).
4. Ganz unten steht immer der Eintrag `„<Suchtext>" als Freitext hinzufügen`,
   der ein Item mit `foodId: null` und `note: <Suchtext>` anlegt.

Damit ist beides in einem Flow: Auto-Completion mit Kategorie-Vererbung und
freie Eingabe.

### 4.4 Meal Plan

- Wochenansicht Montag bis Sonntag, `List.Section` je Tag.
- Navigation eine Woche vor/zurück per Action, aktuelle Woche als Startpunkt.
- Jeder Eintrag zeigt `entryType` als Accessory.
- Actions: Rezept in Mealie öffnen (Enter, sofern rezeptbasiert), Eintrag
  hinzufügen (RecipePicker oder Freitext-Titel), Typ ändern, Datum verschieben,
  Löschen.

### 4.5 Import Recipe

- `Form` mit einem URL-Feld, vorbelegt aus der Zwischenablage, wenn dort eine
  gültige URL liegt.
- Checkbox „Tags aus der Quelle übernehmen" (`include_tags`).
- Während des Imports ein Lade-Toast, danach eine Detailansicht des Ergebnisses
  mit Name, Beschreibung, Zutatenzahl und den Folge-Actions (in Mealie öffnen,
  in Essensplan, auf Einkaufsliste).
- **Wichtig:** Der Scraper kann bei Weiterleitungen still das falsche Rezept
  liefern. Die Ergebnisansicht zeigt deshalb immer den importierten Namen zur
  Sichtprüfung, statt nur „Erfolg" zu melden.

## 5. Architektur

```
src/
  api/
    client.ts        fetch-Wrapper: Basis-URL, Bearer-Auth, Fehler-Mapping, Paginierung
    recipes.ts
    shopping.ts
    mealplan.ts
    foods.ts
    meta.ts          about/self: Version und groupSlug
  hooks/
    useRecipes.ts
    useShoppingLists.ts
    useShoppingItems.ts
    useMealPlan.ts
    useFoods.ts
  components/
    FoodPicker.tsx
    RecipePicker.tsx
    ListPicker.tsx
    actions/          geteilte Action-Komponenten
  types.ts           aus echten API-Antworten abgeleitete Typen
  search-recipes.tsx
  shopping-lists.tsx
  add-to-shopping-list.tsx
  meal-plan.tsx
  import-recipe.tsx
```

Leitregel für den Schnitt: Die `<command>.tsx`-Dateien bleiben dünn und enthalten
nur Komposition. Jede API-Datei kennt genau eine Mealie-Ressource und gibt
getypte Objekte zurück, nie rohe Antworten. `client.ts` ist die einzige Stelle,
die `fetch`, Auth-Header und HTTP-Fehler kennt.

## 6. Datenfluss und Caching

- Lesen über `useCachedPromise` aus `@raycast/utils`. Der Cache sorgt dafür, dass
  ein Command sofort Inhalt zeigt und im Hintergrund aktualisiert.
- Foods werden **einmal komplett** geladen (`per_page=1000`, in der
  Referenzinstanz 609 Einträge, ein Request) und gecacht. Gefiltert wird
  clientseitig per Substring-Match, case- und diakritika-insensitiv. Begründung
  siehe 3.3.
- Schreiben über `mutate` mit Optimistic Update. Abhaken und Löschen wirken
  sofort im UI; schlägt der Request fehl, rollt der Zustand zurück und ein
  Failure-Toast erscheint. Grund: Abhaken passiert im Supermarkt, oft bei
  schlechtem Netz.
- Kein eigener globaler State-Store. Was zwischen Commands überdauern muss
  (zuletzt genutzte Einkaufsliste), liegt in `LocalStorage`.

## 7. Fehlerbehandlung

| Fall | Verhalten |
|---|---|
| Preferences leer oder unvollständig | Command zeigt einen `List.EmptyView` mit Action „Open Extension Preferences", statt zu crashen |
| HTTP 401/403 | Toast „Token ungültig oder abgelaufen" plus Action zu den Preferences |
| HTTP 404 | Toast mit Hinweis, dass die URL vermutlich nicht auf eine Mealie-Instanz zeigt |
| HTTP 400 beim Import | Toast „Diese Seite konnte Mealie nicht auslesen" plus Action, die Rezeptseite manuell zu öffnen |
| Netzwerkfehler / Timeout | Toast mit Retry-Action; gecachte Daten bleiben sichtbar |
| Unerwartete Antwortform | Der Client validiert nur die Felder, die er wirklich nutzt, und ignoriert Unbekanntes |

Alle Fehler laufen über `showFailureToast` aus `@raycast/utils`. Es werden nie
Token, Header oder vollständige URLs in Fehlermeldungen oder Logs ausgegeben.

## 8. Zugangsdaten

Zwei Raycast-Preferences:

| Name | Typ | Zweck |
|---|---|---|
| `mealieUrl` | `textfield` | Basis-URL der Instanz, z.B. `https://mealie.example.org` |
| `apiToken` | `password` | Mealie-API-Token (Bearer) |

Raycast legt Preferences vom Typ `password` im macOS-Keychain ab. Der Token
erscheint dadurch nie in Code, Repo, Shell-Profil oder `.env`.

Der Client verweigert Requests an eine `http://`-URL, die nicht auf `localhost`
oder `127.0.0.1` zeigt, weil der Bearer-Token sonst im Klartext über das Netz
ginge. Falls die Zielinstanz nur über HTTP im LAN erreichbar ist, wird daraus
eine explizite, bewusst zu setzende Preference `allowInsecureHttp` mit
Warnhinweis, kein stiller Durchgriff.

## 9. Teststrategie

Ehrlich abgegrenzt: Raycast bietet kein offizielles Test-Harness für die
UI-Ebene. Getestet wird deshalb das, wo Tests echten Wert liefern.

- **Unit-Tests (Vitest) für `src/api/` und `src/types.ts`-Mapping:** gegen
  Fixtures, die aus den echten Antworten der Verifikation vom 2026-09-01
  abgeleitet und anonymisiert sind. Abgedeckt: Auth-Header-Aufbau,
  URL-Zusammensetzung, HTTP-Fehler-Mapping, HTTPS-Prüfung, Paginierung,
  Food-Item versus Freitext-Item, `image`-Sonderfälle (`null`, `"no image"`,
  Token), Label-Sortierung nach `labelSettings.position`.
- **Unit-Tests für die Filterlogik** der Auto-Completion (Substring, Groß-/
  Kleinschreibung, Umlaute).
- **Manuelle Prüfung** der fünf Commands gegen die echte Instanz vor jedem
  Abschluss, mit Checkliste im Repo.

Keine Snapshot-Tests auf `List.Item`-Rendering.

## 10. Store-Tauglichkeit

Publiziert wird zunächst nichts, die Struktur bleibt aber store-konform:

- `package.json` mit vollständigen Raycast-Metadaten (`name`, `title`,
  `description`, `icon`, `author`, `categories`, `license`)
- `@raycast/eslint-config` plus Prettier
- `README.md` mit Setup-Anleitung (Token in Mealie erzeugen, Preferences setzen)
- `CHANGELOG.md` im Keep-a-Changelog-Format
- Extension-Icon 512x512
- Screenshots erst bei tatsächlicher Publikation

## 11. Annahmen und offene Punkte

| Punkt | Status |
|---|---|
| Exakte Mealie-Version | Nicht erhoben. Client liest sie zur Laufzeit aus `/api/app/about` für Diagnosezwecke. |
| Ableitet Mealie `labelId` serverseitig aus dem Food? | Nicht verifiziert. Client setzt es explizit, deshalb irrelevant. |
| Erreichbarkeit der Instanz per HTTPS | Nicht verifiziert. Siehe Abschnitt 8, Fallback ist eine bewusste Preference. |
| Genauer Pfad der Rezept-Web-URL | `groupSlug` wird zur Laufzeit aus `/api/users/self` gelesen, statt geraten. |
| Mehrere Haushalte pro Account | Außerhalb des Umfangs, siehe Nicht-Ziele. |
