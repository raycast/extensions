# dnb-content-viewer
Show book contents of "Deutsche Nationalbibliothek", if ISBN 10/13 exists

DNB Inhalte - Raycast Extension
Öffne schnell Inhaltsverzeichnisse und Inhaltstexte von Büchern aus der Deutschen Nationalbibliothek (DNB) direkt per ISBN.
Der Sammelauftrag der Deutschen Nationalbibliothek umfasst alle Publikationen in Schrift, Bild und Ton, die seit 1913 in Deutschland, in deutscher Sprache D-A-CH, als Übersetzung aus der deutschen Sprache oder über Deutschland veröffentlicht wurden. Ebenso Netzpublikationen, E-Books und Hörbücher.

📚 Features

ISBN zu DNB-Inhalte: Gib eine ISBN ein und öffne automatisch:

Inhaltsverzeichnis (/04)
Inhaltstext (/34)
Oder beides gleichzeitig


Intelligente Verfügbarkeitsprüfung: Prüft automatisch, ob Inhalte verfügbar sind
Flexibel konfigurierbar: Wähle in den Preferences, welcher Inhalt standardmäßig geöffnet werden soll
Automatischer Fallback: Öffnet den Katalog-Eintrag, wenn keine Inhalte verfügbar sind
ISBN-10 & ISBN-13 Support: Beide Formate werden unterstützt

🚀 Verwendung

Öffne Raycast
Tippe DNB oder dnb
Gib die ISBN ein (z.B. 9783957577597 oder 3957577597)
Drücke Enter

Die Extension sucht automatisch die DNB-IDN und öffnet die gewünschten Inhalte.
⚙️ Einstellungen
In den Raycast Preferences kannst du wählen:

Nur Inhaltsverzeichnis - Öffnet nur das Inhaltsverzeichnis
Nur Inhaltstext - Öffnet nur den Inhaltstext
Beides - Öffnet beide Inhalte in separaten Tabs

🔗 DNB URL-Struktur
Die Extension nutzt folgendes URL-Schema:
https://d-nb.info/{IDN}/04  → Inhaltsverzeichnis
https://d-nb.info/{IDN}/34  → Inhaltstext
https://d-nb.info/{IDN}     → Katalog-Eintrag (Fallback)

📦 Installation
Für die Entwicklung:
bashnpm install
npm run dev
Für die Produktion:
bashnpm run build
🛠️ Technische Details
Die Extension verwendet:

DNB SRU API: Für die Umwandlung ISBN → IDN
HEAD Requests: Zur Prüfung der Verfügbarkeit von Inhalten
Raycast API: Für die native Integration

📄 Lizenz
MIT
🤝 Beitragen
Feedback und Pull Requests sind willkommen!