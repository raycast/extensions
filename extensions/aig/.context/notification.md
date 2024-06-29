    // Zde v následujícím xml tagu Document je aktuální struktura funkcionality notifikací
    <Document id="fileStructure">
    ```bash
    .
    └── src
        ├── interfaces
        │   └── notification.ts # Zde jsou definovány všechny interfaci pro notifikace
        ├── models
        │   └── Notification.ts # Zde je implementace modelu Notification
        ├── providers # Zde jsou implementace jednotlivých notifikačních providerů
        │   ├── Email.ts
        │   └── Slack.ts
        ├── services 
        │   └── Notification.ts # Zde je implementace service která obstarává veškerou logiku pro notifikační systém v AiG Raycast
        ├── types
        │   └── notification.ts # Zde jsou definovány všechny typy pro notifikace
        └── utils
            └── notification # Zde jsou implementace nástrojů pro notifikace
                ├── Formatter.ts
                ├── Handler.ts
                └── Sorter.ts
    ```
    </Document>

    // V následujícím xml tagu Document je aktuální implementace interfací pro notifikace
    <Document id="interfaces/notification">
        {{{file "interfaces/notification"}}}
    </Document>

    // V následujícím xml tagu Document je aktuální implementace modelu Notification
    <Document id="models/Notification">
        {{{file "models/Notification"}}
    </Document>

    // V následujícím xml tagu Document je aktuální implementace notifikačního providera Email
    <Document id="providers/Email">
        {{{file "providers/Email"}}
    </Document>

    // V následujícím xml tagu Document je aktuální implementace notifikačního providera Slack
    <Document id="providers/Slack">
        {{{file "providers/Slack"}}
    </Document>

    // V následujícím xml tagu Document je aktuální implementace service Notification
    <Document id="services/Notification">
        {{{file "services/Notification"}}
    </Document>

    // V následujícím xml tagu Document je aktuální implementace typů pro notifikace
    <Document id="types/notification">
        {{{file "types/notification"}}
    </Document>

    // V následujícím xml tagu Document je aktuální implementace nástrojů pro notifikace
    <Document id="utils/notification/Formatter">
        {{{file "utils/notification/Formatter"}}
    </Document>

    // V následujícím xml tagu Document je aktuální implementace nástrojů pro notifikace
    <Document id="utils/notification/Handler">
        {{{file "utils/notification/Handler"}}
    </Document>

    // V následujícím xml tagu Document je aktuální implementace nástrojů pro notifikace
    <Document id="utils/notification/Sorter">
        {{{file "utils/notification/Sorter"}}
    </Document>
