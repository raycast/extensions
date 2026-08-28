# simplebanking für Raycast

Kontostand, Umsätze und Monatsübersicht aus [simplebanking](https://www.simplebanking.de)
direkt in Raycast.

## Wie es arbeitet

Die Erweiterung ruft das mitgelieferte Kommandozeilenwerkzeug `sb` auf und liest dessen
JSON-Ausgabe. Sie spricht **nicht** selbst mit einer Bank und kennt keine Zugangsdaten.

Gelesen wird der lokale Bestand, den simplebanking beim letzten Abruf abgelegt hat.
Deshalb kostet keiner der Ansichts-Befehle eine TAN, und keiner öffnet ein Browserfenster.

Die einzige Ausnahme ist **Konten aktualisieren** — der Befehl fordert die App zu einem
echten Bankabruf auf und kann je nach Institut eine Freigabe verlangen. Er ist bewusst ein
eigener Befehl, damit das nicht passiert, weil jemand nur den Saldo sehen wollte.

## Voraussetzungen

simplebanking muss installiert sein. Gesucht wird in dieser Reihenfolge:

1. `~/.local/bin/sb` — der Symlink, den simplebanking selbst anlegt
2. `/usr/local/bin/sb`
3. `/Applications/simplebanking.app/Contents/MacOS/simplebanking-cli`
4. dasselbe unter `~/Applications`

Der dritte und vierte Weg sind Absicht: Wer das CLI nie eingerichtet hat, soll die
Erweiterung trotzdem benutzen können, ohne vorher etwas zu tun.

## Befehle

| Befehl | Was er zeigt | Bankabruf |
|---|---|---|
| Kontostand | Salden aller Konten, Summe bei mehreren | nein |
| Umsätze | Buchungen der letzten 30 Tage, durchsuchbar | nein |
| Monatsübersicht | Einnahmen, Ausgaben, Saldo, Kategorien | nein |
| Konten aktualisieren | — | **ja** |

## Entwicklung

```bash
cd raycast
npm install
npm run dev
```
