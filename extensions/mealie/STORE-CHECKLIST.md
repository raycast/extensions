# Store-Checkliste

Stand 2026-09-01. Was für eine Publikation im Raycast Store fehlt und was schon steht.

## Erledigt

- [x] `package.json` mit Name, Titel, Beschreibung, Icon, Kategorie, Lizenz
- [x] Fünf Commands mit Titel und Beschreibung
- [x] Drei Preferences, Token als Typ `password` (Keychain)
- [x] Extension-Icon 512x512 RGBA
- [x] `README.md` mit Setup-Anleitung
- [x] `CHANGELOG.md` im Raycast-Format mit `{PR_MERGE_DATE}`
- [x] `LICENSE` (MIT)
- [x] ESLint und Prettier sauber (`npm run fix-lint`)
- [x] `ray build` läuft durch
- [x] 57 Unit-Tests grün

## Offen, kann nur Joschka erledigen

### 1. Author-Handle

`ray lint` bricht ab:

```
Invalid author "joschkarick"
404 https://www.raycast.com/api/v1/users/joschkarick
```

Der Wert in `package.json` unter `author` muss ein existierender Raycast-Handle
sein. Zu finden in Raycast unter `Cmd+,` im Reiter **Account**, oder auf
raycast.com nach dem Login in der Profil-URL.

Prüfen lässt sich ein Kandidat so:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://www.raycast.com/api/v1/users/DEIN_HANDLE
```

`200` heißt: existiert. `404` heißt: falscher Handle.

Danach in `package.json` eintragen und `npm run lint` muss sauber durchlaufen.

### 2. Store-Screenshots

Quelle: https://developers.raycast.com/basics/prepare-an-extension-for-store,
abgerufen am 2026-09-01. Es gibt **keine** Aktion "Create Screenshot" im
Action-Panel, eine fruehere Fassung dieser Datei behauptete das faelschlich.

Der Weg ab Raycast 1.37.0:

1. **Window Capture** in den **Advanced Preferences** einrichten und einen
   Hotkey vergeben, die Doku nennt als Beispiel `Cmd+Shift+Alt+M`.
2. Die Extension muss im **Development Mode** laufen (`npm run dev`).
   Window Capture blendet dann die Dev-Menues und -Icons aus dem Bild.
3. Den gewuenschten Command oeffnen.
4. Hotkey druecken und dabei **"Save to Metadata"** ankreuzen. Raycast legt
   die Datei selbst korrekt unter `metadata/` ab.

Window Capture verwendet den **aktuellen Desktop-Hintergrund** als Bildhintergrund.
Vorher einen kontrastreichen Hintergrund setzen und fuer alle Screenshots
denselben verwenden.

Vorgaben:

| Punkt | Wert |
|---|---|
| Groesse | 2000 x 1250 Pixel, Querformat |
| Seitenverhaeltnis | 16:10 |
| Format | PNG |
| Anzahl | maximal 6, mindestens 3 empfohlen |
| Light und Dark mischen | nein |

Weitere Regeln aus der Doku: keine anderen Anwendungen im Bild, nicht mehrere
verschiedene Hintergruende ueber die Screenshots hinweg.

Sinnvolle Motive, je einen pro Command:

1. `Search Recipes` mit Suchergebnissen
2. `Add to Shopping List` mit sichtbaren Label-Tags neben den Foods
3. `Shopping Lists` mit den nach Label gruppierten Sektionen
4. `Meal Plan` mit einer gefuellten Woche
5. Der Tagesauswahl-Screen aus `Cmd+M`

**Datenschutz-Hinweis, woertlich aus der Doku:** Screenshots sind im Store
sichtbar und liegen zusaetzlich im oeffentlichen Repository
`raycast/extensions`. Ueber die Git-Historie bleiben sie auch dann abrufbar,
wenn ein Bild spaeter ausgetauscht wird. Betroffen waeren deine Rezeptnamen,
deine Einkaufslisten samt Inhalt und dein Wochen-Essensplan. Wer das vermeiden
will, nimmt die Screenshots gegen eine zweite Instanz oder gegen eigens
angelegte Wegwerf-Eintraege auf.

## Publikation

Erst wenn beides erledigt ist:

```bash
npm run lint     # muss sauber sein
npm run build
npm run publish
```

`npm run publish` legt einen Pull Request im Repository `raycast/extensions` an.
Das ist eine öffentliche Einreichung unter deinem Namen, deshalb habe ich sie
bewusst nicht ausgeführt.

## Punkte für den Store-Review

- Die Command-Subtitles lauten alle `Mealie`. Der Lint akzeptiert das, manche
  Reviewer bemängeln aber eine Wiederholung des Extension-Namens. Falls im
  Review angemerkt: Subtitles ersatzlos streichen.
- Die Extension setzt eine selbst gehostete Mealie-Instanz voraus. Reviewer
  haben keine. Im PR-Text erwähnen, sonst kommt die Rückfrage.
