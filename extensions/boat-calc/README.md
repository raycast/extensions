# Båtberäknare

En Raycast-extension för att beräkna båtresor. Beräkna distans, tid eller hastighet när du reser på vattnet.

## Funktioner

- Beräkna distans, tid eller hastighet för båtresor
- Ange två värden för att beräkna det tredje
- Visar tid i både decimalformat och timmar/minuter
- Stöd för distansminuter, timmar och knop
- Realtidsberäkningar
- Kopiera resultat till urklipp

## Installation

1. Öppna Raycast
2. Gå till Extensions
3. Sök efter "Båtberäknare"
4. Klicka på "Installera"

## Användning

1. Öppna Raycast (⌘ + Space)
2. Sök efter "Båtberäknare"
3. Ange två av följande värden:
   - Distans (i distansminuter)
   - Tid (i timmar)
   - Hastighet (i knop)
4. Klicka på "Beräkna" eller tryck Enter
5. Se resultatet i både formuläret och i en notifiering

## Exempel

- Ange distans (10nm) och tid (2h) för att beräkna hastighet
- Ange distans (10nm) och hastighet (5knop) för att beräkna tid
- Ange tid (2h) och hastighet (5knop) för att beräkna distans

## Enheter

- Distans: distansminuter (nm)
- Tid: timmar (h)
- Hastighet: knop (knop)

## Utveckling

```bash
# Installera beroenden
npm install

# Starta utvecklingsläge
npm run dev

# Bygg extension
npm run build

# Publicera till Raycast Store
npm run publish
```

## Licens

MIT