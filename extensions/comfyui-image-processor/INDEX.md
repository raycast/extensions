# 🎨 ComfyUI Image Processor for Raycast

> Raycast extension pro zpracování obrázků přes ComfyUI s podporou vlastních workflow a promptů

[![Raycast](https://img.shields.io/badge/Raycast-Extension-red)](https://raycast.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.5+-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## 📦 Co je v balíčku?

Tento projekt převádí Python skript `multiimage_edit.py` na plnohodnotnou Raycast extension s GUI.

### Hlavní funkce

- ✅ **Dávkové zpracování obrázků** - Zpracujte více obrázků najednou
- ✅ **Vlastní workflows** - Použijte jakýkoliv ComfyUI workflow
- ✅ **Custom prompty** - Upravte prompty bez úpravy workflow
- ✅ **Historie promptů** - Rychlý přístup k posledním 10 promptům
- ✅ **Home Assistant integrace** - Automatické zapnutí serveru
- ✅ **Správa workflows** - Přehled, duplikace, mazání
- ✅ **Progress tracking** - Sledování postupu zpracování

## 🚀 Rychlý start

```bash
# 1. Automatická instalace
./install.sh

# 2. Import do Raycastu
# Raycast → Import Extension → Vyberte tuto složku

# 3. Nastavte preferences
# Server URL, Workflows Path, atd.

# 4. Hotovo!
# Raycast → "Process Images"
```

## 📚 Dokumentace

| Soubor | Popis |
|--------|-------|
| **README.md** | Kompletní dokumentace s API referencí |
| **QUICKSTART.md** | Krok za krokem průvodce instalací |
| **CHEATSHEET.md** | Rychlá reference s příkazy a tipsy |
| **ICON_README.md** | Instrukce pro vytvoření ikonky |

## 📁 Struktura projektu

```
.
├── src/
│   ├── index.tsx               # 🖼️ Hlavní příkaz pro zpracování
│   ├── manage-workflows.tsx    # 🔧 Správa workflow souborů
│   └── utils/
│       └── comfyui.ts          # 🔌 ComfyUI API wrapper
│
├── package.json                # 📦 NPM konfigurace
├── tsconfig.json               # ⚙️ TypeScript config
├── .gitignore                  # 🚫 Git ignore
│
├── install.sh                  # 🚀 Instalační script
├── create-icon.sh              # 🎨 Helper pro ikonku
├── icon-template.svg           # 🖼️ SVG šablona
├── example-workflow.json       # 📝 Příklad workflow
│
├── README.md                   # 📖 Hlavní dokumentace
├── QUICKSTART.md               # ⚡ Rychlý start
├── CHEATSHEET.md              # 📝 Cheat sheet
└── ICON_README.md             # 🎨 Info o ikonce
```

## ⚙️ Požadavky

- **macOS** (Raycast je pouze pro macOS)
- **Raycast** 1.50.0+
- **Node.js** 18+
- **ComfyUI** server (běžící na lokální síti nebo vzdáleně)

## 🔧 Konfigurace

### Povinné nastavení (Raycast Preferences)

```
Server URL:        http://192.168.3.88:5000
Workflows Path:    ~/Documents/ComfyUI/workflows
Output Suffix:     _edited
```

### Volitelné (Home Assistant)

```
HA URL Internal:   http://192.168.3.114:8188
HA URL External:   http://188.75.144.234:8188
HA Token:          eyJhbGc...
ComfyUI Switch:    switch.comfyui
```

## 💡 Použití

### Process Images

1. Otevřete Raycast (`Cmd+Space`)
2. Napište `Process Images`
3. Vyberte obrázky (jeden nebo více)
4. Vyberte workflow
5. (Volitelně) Zadejte vlastní prompt
6. Stiskněte `Enter`

### Manage Workflows

1. Otevřete Raycast
2. Napište `Manage Workflows`
3. Zobrazí se seznam všech workflow s metadaty
4. Použijte akce (otevřít, duplikovat, smazat, atd.)

## 📸 Příklady workflow

Extension obsahuje `example-workflow.json` pro testování.

### Minimální workflow struktura:

```json
{
  "1": {
    "class_type": "LoadImage",
    "inputs": { "image": "placeholder.png" }
  },
  "2": {
    "class_type": "CLIPTextEncode",
    "inputs": { "text": "beautiful photo" },
    "_meta": { "title": "Positive Prompt" }
  }
}
```

## 🛠️ Development

```bash
# Development mód s hot reload
npm run dev

# Build pro production
npm run build

# Lint
npm run lint

# Fix lint issues
npm run fix-lint
```

## 🐛 Troubleshooting

### Extension se neimportuje
- Zkontrolujte že existuje `command-icon.png`
- Spusťte `npm run build`
- Restartujte Raycast

### Server není dostupný
- Ověřte že ComfyUI běží: `curl http://YOUR_SERVER:5000/system_stats`
- Zkontrolujte URL v preferences
- Pokud používáte HA, ověřte token a switch entity

### Workflow nefunguje
- Exportujte z ComfyUI jako "Save (API Format)"
- Musí obsahovat `LoadImage` node
- Ověřte JSON syntax

## 🎯 Roadmap

- [ ] Support pro více SaveImage nodů
- [ ] Batch export do různých formátů
- [ ] Preset management (uložené kombinace workflow + prompt)
- [ ] Progress notifications s preview
- [ ] Drag & drop support v Raycast
- [ ] Cloud workflow sync

## 📄 License

MIT License - použijte jak chcete!

## 🙏 Credits

- Založeno na původním Python skriptu `multiimage_edit.py`
- Postaveno na [Raycast API](https://developers.raycast.com/)
- Integrace s [ComfyUI](https://github.com/comfyanonymous/ComfyUI)

## 🤝 Contributing

Pull requesty vítány! Pro větší změny prosím nejdřív otevřete issue.

---

**Vytvořeno s ❤️ pro produktivní práci s AI generovanými obrázky**
