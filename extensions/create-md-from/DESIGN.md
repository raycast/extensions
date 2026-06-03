# Create MD From — Raycast Extension · Design Doc

> Slug (id interno): `create-md-from` · Title visible store: **"Create Markdown From"** (buscable). Commands se leen "Create Markdown From Selection/Clipboard/Current Tab".
> Estado: **diseño cerrado, sin código**. Documento inicial tras sesión de grilling.
> Fecha: 2026-06-03
> Referencia: seguir SIEMPRE la doc oficial → https://developers.raycast.com

---

## 1. Qué es

Extensión de Raycast (macOS) que **crea archivos `.md`** a partir de contenido que el usuario elige,
y los guarda en una carpeta configurable. Pensada para captura rápida de contenido para research.

**Job to be done:** invocar Raycast → elegir la fuente → `↵` → tienes un `.md` guardado. Sin abrir editor, sin copiar/pegar manual.

---

## 2. Commands (3)

Decisión: **commands separadas** (idiomático en Raycast: cada una con su alias/hotkey).
Excepción consciente: la de clipboard es "inteligente" (detecta URL).

Las commands se titulan `From X` para que Raycast las muestre como `Create Markdown From X`.

| Command (title) | Se lee como | Tipo | Comportamiento |
|---|---|---|---|
| `From Selection` | Create Markdown From Selection | `view` (Form) | Texto seleccionado (`getSelectedText()`) → `.md` |
| `From Clipboard` | Create Markdown From Clipboard | `view` (Form) | **Detecta**: si el clipboard es una URL válida → fetch + readability + markdown. Si no → texto literal del clipboard. |
| `From Current Tab` | Create Markdown From Current Tab | `view` (Form) | `BrowserExtension.getContent({ format: "markdown" })` (reader mode, ya en MD). **Requiere la Browser Extension de Raycast instalada.** |

> v1 **NO** incluye la secondary action "guardar URL como texto plano". La detección inteligente cubre el 95%. Se añade después si hace falta (~10 min).

---

## 3. Flujo de cada command (Form rápido)

No es "dispara y olvida" puro, ni form pesado: **Form optimizado para `↵` inmediato**.

1. Invocas la command.
2. Se resuelve el contenido de la fuente (selección / clipboard / tab).
3. Se abre un `Form` con:
   - **Campo nombre** → pre-rellenado y **autoseleccionado** (escribes y sobrescribes directo).
   - **Campo carpeta** → `Form.FilePicker` (`canChooseDirectories: true`, `canChooseFiles: false`), pre-seleccionado a la carpeta por defecto del setting.
4. `↵` (SubmitForm) → guarda → HUD/Toast de confirmación.

**90% del uso = invocar → `↵`.** El resto: cambiar nombre (directo, está autoseleccionado) o, raramente, la carpeta.

---

## 4. Naming (nombre pre-rellenado)

| Fuente | Nombre propuesto |
|---|---|
| Selección | 1ª línea / primeras ~8 palabras del texto |
| Clipboard (texto) | 1ª línea del contenido |
| Clipboard (URL) | `<title>` de la página (lo tenemos del fetch) |
| Pestaña abierta | título de la pestaña (`BrowserExtension.getTabs` → `title`) |

Reglas:
- **Legible**, no slug-kebab (es un nombre que lee el humano: espacios y mayúsculas OK).
- **Saneado**: reemplazar chars ilegales en filename (`/`, `:`, etc.) por `-`.
- **Truncar** a ~60 chars.
- **Fallback** si no hay título / texto vacío → `Untitled` (o fecha).
- La extensión `.md` la añade el código, no el usuario.

---

## 5. Contenido del archivo

**Solo contenido. SIN frontmatter** (v1).
- Frontmatter (title/source/date/type) se evaluó y se descartó para arrancar simple. Fácil de añadir como preferencia toggleable más adelante.

---

## 6. Guardado

- **Carpeta por defecto** → preference de tipo `directory` (nativo de Raycast), default a `~/Desktop` (o `~/Downloads`). Se fija una vez en ajustes.
- **Override por guardado** → vía el `Form.FilePicker`, pre-seleccionado a la default.
- **Colisión de nombre** (ya existe el archivo) → **auto-sufijo** estilo Finder: `Nombre.md`, `Nombre 2.md`, `Nombre 3.md`. Nunca sobrescribe, nunca pregunta.

---

## 7. Manejo de errores (defaults)

- **Sin texto seleccionado** → Toast: "No hay texto seleccionado".
- **Clipboard vacío** → Toast: "El clipboard está vacío".
- **Fetch de URL falla** (JS-rendered, paywall, bloqueo anti-bot, readability no extrae) → Toast claro:
  > "No se pudo extraer el contenido. Prueba a abrir la web y seleccionar todo (⌘A), luego usa *Create MD From Selection*."
- **Browser Extension no instalada** (en Save Current Tab) → Toast con link/indicación para instalarla.

---

## 8. Stack técnico

- **TypeScript + React** sobre `@raycast/api` (scaffold oficial: `Create Extension` desde Raycast, o `npm init raycast-extension`).
- `@raycast/utils` para helpers (toasts, promesas).
- **Pipeline URL** (para Clipboard-URL): `fetch(url)` → extracción de artículo → HTML→Markdown.
  - `@mozilla/readability` (extraer el artículo, modo lector).
  - `turndown` (HTML → Markdown).
- **Save Current Tab** NO necesita pipeline: `BrowserExtension.getContent({ format: "markdown" })` devuelve MD directamente.

### ⚠️ Decisión de implementación abierta (no de diseño)
`@mozilla/readability` necesita un **DOM en Node** (Raycast corre Node, no navegador). Opciones:
- **`jsdom`** → oficialmente lo que usa/testea readability, pero pesado.
- **`linkedom`** → mucho más ligero, normalmente compatible, pero menos "bendecido".

Recomendación tentativa: empezar con `linkedom` por peso; si readability falla en webs comunes, caer a `jsdom`. **A decidir al implementar, probando.**

---

## 9. Preferences (extensión)

| Preference | Tipo | Default | Notas |
|---|---|---|---|
| `defaultFolder` | `directory` | `~/Desktop` | Carpeta destino por defecto |

(Frontmatter toggle, fetch timeout, etc. → futuro, no v1.)

---

## 10. Fuera de scope (v1)

- Frontmatter / metadatos.
- Secondary action "URL como texto plano".
- Servicio reader externo (ej. r.jina.ai) como fallback del pipeline — se descartó por privacidad/dependencia de terceros.
- Soporte explícito a navegadores fuera de lo que cubra la Browser Extension de Raycast.

---

## 11. Próximos pasos

1. Scaffold oficial de la extensión (`Create Extension`).
2. Definir los 3 commands en `package.json` (manifest) + la preference `defaultFolder`.
3. Lógica compartida: resolver contenido → naming → saneado → guardado con auto-sufijo → Form.
4. Implementar pipeline URL y decidir `linkedom` vs `jsdom` probando.
5. `npm run dev` → probar en caliente las 3 fuentes.

---

## 12. Notas de implementación (post-build) — desviaciones del diseño

- **Imágenes en selección**: `getSelectedText()` es texto plano (limitación de API). La ruta para imágenes es copiar (⌘C) → `From Clipboard`, que lee `Clipboard.read().html` y lo convierte con turndown preservando `<img>`.
- **Orden de detección en From Clipboard**: URL → fetch artículo · HTML rico → markdown con imágenes · texto literal.
- **Persistencia de carpeta**: la última carpeta usada se guarda en `LocalStorage` (`last-folder`) y se ofrece como default la próxima vez (fallback: preference → `~/Desktop`).
- **Guard de navegador**: `environment.canAccess(BrowserExtension)` para fallar con toast si la extensión no está. Limitación: si hay otro navegador delante sin la extensión pero uno CON ella detrás, captura el de detrás sin error (la API no expone la app en foco).
- **Enter guarda**: acción secundaria con `shortcut={{ modifiers: [], key: "return" }}`. Funciona, pero el footer SIEMPRE muestra `⌘↵` — Raycast no renderiza shortcuts custom en acciones primaria/secundaria de forms. Cosmético, no arreglable.

## 13. Store-readiness checklist

- [x] README.md
- [x] CHANGELOG.md (`{PR_MERGE_DATE}`)
- [x] Icono 512×512 (mark de Markdown, claro+oscuro)
- [ ] `author` = usuario real de Raycast (pendiente confirmar)
- [ ] Screenshots 2000×1250 en `metadata/` (se exportan desde Raycast en dev)
- [ ] `ray build` + `ray lint` limpios
- [ ] `npm run publish` → PR a raycast/extensions
