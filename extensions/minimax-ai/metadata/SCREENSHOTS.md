# Screenshots para Raycast Store

## Requisitos del Store

- **Formato:** PNG
- **Dimensiones:** 2000x1250 pixels
- **Cantidad:** 3-6 screenshots (mínimo 3 recomendado)

## Screenshots requeridos

| Archivo | Descripción |
|---------|-------------|
| `ask-ai-1.png` | Ask AI: Pantalla inicial con el campo de pregunta |
| `ask-ai-2.png` | Ask AI: Respuesta de streaming en acción |
| `ai-chat-1.png` | AI Chat: Lista de conversaciones |
| `ai-chat-2.png` | AI Chat: Conversación activa con historial |
| `ai-chat-3.png` | AI Chat: Menú de acciones (opcional) |

## Cómo capturar screenshots

### 1. Configurar Window Capture en Raycast

1. Abrir Raycast → Preferences → Advanced
2. Buscar "Window Capture"
3. Asignar hotkey: `⌘⇧⌥M` (o la que prefieras)

### 2. Capturar

1. Ejecutar `npm run dev` para modo desarrollo
2. Abrir cada comando y navegar a la vista deseada
3. Usar el hotkey de Window Capture (captura a 2000x1250)
4. Guardar en esta carpeta con los nombres indicados

## Guías de estilo

- Usar el mismo fondo en todas las capturas (consistencia)
- No mostrar datos sensibles
- Usar un solo tema (light o dark, no mezclar)
- Enfocarse solo en la extensión, no en otras apps

## Verificación

```bash
# Verificar dimensiones de los screenshots
sips -g pixelHeight -g pixelWidth metadata/*.png
```

Dimensiones esperadas:
- pixelHeight: 1250
- pixelWidth: 2000

## Referencias

- [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Figma Screenshot Template](https://www.figma.com/community/file/1083160585697279319/raycast-extension-screenshot-template)
