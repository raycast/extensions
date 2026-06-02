# Dailyweb.pl Newsy — Raycast Extension

Czytnik wpisów z [Dailyweb.pl](https://dailyweb.pl) dla Raycasta. Przeglądaj najnowsze artykuły, filtruj po kategorii lub autorze, szukaj — bez opuszczania Raycasta.

---

## Wymagania

- [Raycast](https://raycast.com) 1.26+
- Node.js 22.14+
- npm 7+

---

## Instalacja (tryb deweloperski)

```bash
git clone <repo>
cd Dailyweb-Reader-raycast
npm install
npm run dev
```

Raycast automatycznie wykryje rozszerzenie i załaduje je w sekcji **Development**.

---

## Funkcje

### Główny ekran — lista lub siatka

W **Ustawieniach** wybierz układ **Lista** albo **Siatka**:

| Układ | Widok |
|-------|--------|
| **Siatka** (domyślnie) | Karty: okładka, tytuł, data · autor |
| **Lista** | Wiersze: okładka + tytuł; podgląd po prawej |

- **Sekcje czasowe** — wpisy pogrupowane na: *Dziś*, *Wczoraj*, *Wcześniej*
- **Panel podglądu** — po prawej stronie: pełny tytuł, zajawka, autor (z avatarem), kategoria, data, link
- **Miniatura** — okładka artykułu jako ikona po lewej stronie listy
- **Wiersz listy** — tylko okładka i tytuł (autor, kategoria i data w panelu podglądu po prawej)
- **Nieprzeczytane** — śledzone w LocalStorage; oznaczenie po podglądzie lub otwarciu (akcje w panelu Cmd+K)
- **Doładowanie wpisów** — przewiń na dół lub użyj „Załaduj więcej” w stopce Raycasta

### Wyszukiwanie

Wpisz frazę w pasku wyszukiwania — lista przełącza się w tryb wyszukiwania po stronie serwera (`?search=`). Po wyczyszczeniu wraca do przeglądania z sekcjami.

### Filtrowanie po kategorii

Dropdown po prawej stronie paska — dostępne kategorie:

| Sekcja | Kategorie |
|--------|-----------|
| Tech | Tech (wszystkie), Mobile, Sprzęt, Foto Video, AI, Audio, Smart Home, Web |
| Rozrywka | Rozrywka (wszystkie), Gry, Gaming, Filmy i seriale, Lifestyle |
| Inne | Aktualności, Marketing i nowe media |

### Akcje (Cmd+K na zaznaczonym wpisie)

| Akcja | Skrót | Opis |
|-------|-------|------|
| Otwórz w przeglądarce | Enter | Otwiera artykuł w domyślnej przeglądarce |
| Kopiuj link | Cmd+. | Kopiuje URL do schowka |
| Pokaż kategorię: X | — | Filtruje listę po kategorii aktualnego wpisu |
| Więcej od: [autor] | — | Filtruje listę po autorze aktualnego wpisu |
| Pokaż wszystkie wpisy | Cmd+R | Reset filtrów (autor/kategoria) |
| Odśwież | Cmd+Shift+R | Pobiera listę od nowa |
| Ustawienia rozszerzenia | — | Otwiera panel ustawień |

---

## Ustawienia

Dostępne w: **Raycast Preferences → Extensions → Dailyweb.pl Newsy**

| Ustawienie | Opcje | Domyślnie | Opis |
|------------|-------|-----------|------|
| Powiadomienia w tle | tak/nie | nie | Włącz powiadomienia o nowych wpisach |
| Częstotliwość sprawdzania | Co godzinę / Co 3h / Co 6h | Co godzinę | Jak często sprawdzać nowe wpisy |
| Kategoria powiadomień | All, Aktualności, Mobile, Rozrywka, Gry | All | Powiadamiaj tylko o wybranej kategorii |
| Układ | Lista / Siatka | Siatka | Siatka = karty; Lista = wiersze z podglądem |
| Kolumny siatki | 2 / 3 | 3 | Liczba kart w rzędzie (tylko układ Siatka) |
| Liczba wpisów | 5 / 10 / 15 / 30 | 5 | Ile wpisów wczytać naraz |

---

## Powiadomienia w tle

Rozszerzenie zawiera ukrytą komendę sprawdzającą nowe wpisy. Jest wyłączona domyślnie — nie widać jej w wyszukiwarce Raycasta.

**Jak włączyć:**
1. Raycast Preferences → Extensions → Dailyweb.pl Newsy
2. Przy komendzie *„sprawdź nowe wpisy"* — przełącz toggle na **włączone**
3. W ustawieniach rozszerzenia zaznacz **Włącz powiadomienia**

**Jak działa:**
- Raycast budzi komendę co 30 minut (granularność systemu)
- Przy każdym przebudzeniu sprawdza czy minął czas z preferencji (1h/3h/6h) — jeśli nie, kończy bez akcji
- Jeśli czas minął: pobiera najnowszy wpis (opcjonalnie z wybranej kategorii)
- Porównuje z ostatnio zgłoszonym ID (zapisanym w LocalStorage)
- Jeśli pojawił się nowy wpis — pokazuje HUD z tytułem
- Przy pierwszym uruchomieniu zapisuje ID bez powiadomienia (brak false-positive)

---

## Źródło danych

Rozszerzenie używa publicznego WordPress REST API Dailyweb.pl:

```
https://dailyweb.pl/wp-json/wp/v2/posts?_embed&per_page=5&page=1
```

Parametr `_embed` dociąga w jednym żądaniu: miniaturę (`wp:featuredmedia`), autora z avatarem (`author`), kategorie (`wp:term`).

**Znane ograniczenia:**
- Niektóre wpisy Dailyweb.pl prowadzą do przekierowania na stalka.pl lub inny portal z tej samej sieci — redirect dzieje się po stronie serwera HTTP, API nie ujawnia docelowego URL
- Excerpt może być pusty dla niektórych wpisów — panel podglądu wyświetla wtedy tylko tytuł

---

## Struktura projektu

```
├── assets/
│   └── icon.png              # Ikona rozszerzenia (512×512, logo Dailyweb)
├── src/
│   ├── index.tsx             # Router: lista vs siatka
│   ├── posts-list-view.tsx   # Układ lista
│   ├── posts-grid-view.tsx   # Układ siatka
│   ├── background.tsx        # Komenda tła — powiadomienia
│   ├── use-posts-feed.ts     # Pobieranie i filtry wpisów
│   ├── constants.ts          # BASE_URL, klucze LocalStorage
│   ├── use-read-posts.ts     # Stan przeczytanych wpisów
│   └── utils.ts              # decodeHtmlEntities, formatDate, stripHtml
├── package.json              # Manifest rozszerzenia + zależności
└── tsconfig.json
```

---

## Rozwój

```bash
npm run dev      # tryb deweloperski z hot-reload
npm run build    # build produkcyjny
npm run lint     # ESLint
```

Stack: TypeScript + React, `@raycast/api ^1.104`, `@raycast/utils ^2.2`.
