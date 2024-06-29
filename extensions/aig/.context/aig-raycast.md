// V následujícím xml tagu Document je základní popis AiG systému
<Document id="projectInformations">
    - Tento aktuální projekt který řešíš se jmenuje AiG Raycast.
    - AiG Raycast je zaměřen na zvýšení uživatelovi produktivity a efektivity.
    - AiG Raycast je extension do aplikace Raycast. (Raycast je aplikace pro macOS, která umožňuje rychlý přístup k aplikacím, souborům a dalším funkcím díky kterým lze customizovat ovládání systému a zvýšit produktivitu)

    Aktuální implementace Raycast komandu:

    1. Command Menu:
    - Po spuštění zobrazí hlavní AiG Raycast menu v top menu baru na macOS.
    - Menu obsahuje všechny dostupné AiG Raycast funkcionality.
    - Zobrazuje shromážděné a vyfiltrované notifikace z vybraných informačních kanálů včetně AiG systémových notifikací. 
    - Je to hlavní informační bod celého AiG systému.
    
    ```bash
    .
    ├── package.json # Zde je definován vstupní bod Menu Command
    └── src
        └── menu.tsx # Zde je implementace Menu Command
    ```
</Document>
