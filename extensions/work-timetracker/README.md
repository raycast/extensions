# Work Timetracker

Ett enkelt verktyg för att logga arbetstid, följa upp dina timmar och jämföra dem med dina normtimmar varje månad. All data lagras lokalt och kan exporteras.

## Funktioner

* **Projekt-hantering** – lägg till, lista, redigera och ta bort projekt
* **Tidsloggning** – logga timmar per projekt med datum och valfri kommentar
* **Månadsrapport** – se detaljerad månadsvy och jämför mot normtimmar
* **Projekt-specifik rapport** – rapportera timmar för valfritt projekt och period
* **CSV-export** – exportera månadsrapporten till CSV
* **Inställbar normen-per-dag** – ange dina standardtimmar per arbetsdag
* **Lokal lagring** – alla uppgifter sparas endast på din dator

## Kommandon

This extension provides the following commands:

* **Logga arbetstid** (`log-work-hours`)
  * Logga timmar för idag eller valfritt datum, inklusive anteckning

* **Visa månadsrapport** (`view-monthly-work-report`)
  * Se summering av loggade timmar, jämför med normtimmar och exportera CSV

* **Lägg till projekt** (`add-new-project`)
  * Skapa ett nytt projekt‐namn att logga tid mot

* **Lista projekt** (`list-projects`)
  * Visa, redigera eller ta bort registrerade projekt

* **Projekt-rapport** (`project-report`)
  * Välj projekt och period för summering av timmar

## Configuration

### Core preference

* **Default Standard Hours per Day** (`defaultStandardHoursPerDay` – Textfield, default `8`)

### Monday.com integration (optional)

Enable this if you want every logged time entry to skapas som ett nytt **item** på en Monday-board.

| Preference | Type | Beskrivning |
|------------|------|-------------|
| `mondayEnabled` | Checkbox | Slå av/på integrationen |
| `mondayApiKey` | Password | Personlig API-nyckel från Monday.com |
| `mondayBoardId` | Textfield | ID för boarden där items skapas |
| `mondayGroupId` | Textfield | Standardgrupp att lägga items i |
| `mondayColumnDate` | Textfield | Kolumn-ID för datum |
| `mondayColumnHours` | Textfield | Kolumn-ID för antal timmar |
| `mondayColumnNotes` | Textfield | Kolumn-ID för kommentarer |
| `mondayColumnPerson` | Textfield | Kolumn-ID för person (People) för att tilldela dig (default `person`) |

När integrationen är på läggs varje tidslogg in som ett nytt item med:

* Item-namn: `<Projekt>: <antal timmar> timmar`
* Datumkolumn sätts till loggens datum
* Hours-kolumn sätts till det inloggade värdet
* Notes-kolumn får eventuella anteckningar
* Person-kolumnen sätts till dig (om `mondayColumnPerson` är angiven)

#### Projektspecifika grupper

När du skapar ett projekt finns ett fält **Monday Group ID**. Om du anger ett värde kommer poster som loggas på det projektet att skapas i den gruppen (annars används `mondayGroupId`).

---

*Konfigurera allt i Raycast → Preferences → Extensions → Work Timetracker. Ingen `.env`-fil behövs.*

## Så använder du extensionen

1. **Lägg till projekt** – kör *Lägg till projekt* och registrera dina kunder/projekt (ange ev. Monday-grupp-ID).
2. **Logga tid** – använd *Logga arbetstid* varje dag.
3. **Se månadsrapport** – *Visa månadsrapport* för aktuell eller valfri månad; exportera vid behov.
4. **Hantera projekt** – *Lista projekt* för att byta namn eller ta bort projekt (om ingen tid är loggad).
5. **Projektrapport** – få snabb överblick över ett enskilt projekt.

## Datatlagring

Alla projekt och tidsrader sparas lokalt i Raycasts LocalStorage. Inget skickas externt (förutom när du själv aktiverar Monday-sync).

---

*Remember to build the extension (`npm run build` or `ray build`) if you have made changes to the code for them to be reflected in Raycast.*