# Contexto del Proyecto - MiniMax

**Última actualización:** 2026-01-29

## Estado Actual

El proyecto está **funcional**. Es una extensión de Raycast para chat con IA usando MiniMax M2.1.

## Lo que Funciona

- **AI Chat**: Chat conversacional con historial en sidebar
  - Seleccionar conversación la abre automáticamente
  - Escribir en barra superior y Enter para enviar
  - New Chat limpia la vista y crea conversación al enviar primer mensaje
  - Historial persiste en LocalStorage de Raycast

- **Ask AI**: Pregunta rápida con streaming
  - Formulario inicial para escribir pregunta
  - Vista de respuesta con streaming
  - Opción de continuar en chat

- **Streaming**: Respuestas en tiempo real con MiniMax M2.1

- **Filtrado de thinking**: Se elimina contenido `<think>...</think>` del modelo

## Decisiones de Diseño

1. **UI de chat**: Lista a la izquierda (historial) + Detail a la derecha (conversación)
2. **Input de mensajes**: Usa la barra de búsqueda de Raycast como input
3. **Sin comando de historial separado**: Integrado en AI Chat
4. **Diferenciación visual**:
   - User: texto normal con `**You**`
   - Assistant: blockquote (`>`) con `**Assistant**`
5. **New Chat**: No crea conversación hasta enviar primer mensaje

## Arquitectura

```
src/
├── ai-chat.tsx          # Comando principal, maneja estado global
├── ask-ai.tsx           # Pregunta rápida
├── providers/
│   ├── base.ts          # Interfaces (AIProvider, Message, etc.)
│   └── minimax.ts       # Implementación MiniMax con streaming
├── hooks/
│   └── useChat.ts       # Estado del chat, envío de mensajes
├── components/
│   ├── ChatView.tsx     # UI principal del chat
│   └── QuickAIResult.tsx
└── utils/
    ├── storage.ts       # CRUD de conversaciones (LocalStorage)
    └── errors.ts        # Manejo de errores con Toast
```

## Flujo de Datos

1. `ai-chat.tsx` carga conversaciones del storage
2. `useChat` hook maneja mensajes y streaming
3. `ChatView` renderiza UI y captura input
4. Al enviar: `useChat.sendMessage()` → `MiniMaxProvider.chatStream()` → actualiza estado → guarda en storage

## Posibles Mejoras

- [ ] Soporte para más providers (OpenAI, Anthropic, etc.)
- [ ] Exportar conversaciones a archivo
- [ ] Búsqueda en historial de conversaciones
- [ ] Editar/regenerar mensajes
- [ ] Atajos de teclado adicionales
- [ ] Soporte para imágenes (si el provider lo permite)
- [ ] Configuración de modelo por conversación

## Problemas Conocidos

- Ninguno crítico reportado

## Cómo Retomar

```bash
cd /Users/monforte/Desktop/projects/raycast_ia_byk
npm run dev
```

Abrir Raycast → "AI Chat" → Configurar API key en preferencias si es primera vez.

## Notas Técnicas

- La API key se guarda en el Keychain de macOS (gestionado por Raycast)
- El streaming usa Server-Sent Events (SSE) parseando `data: {...}` chunks
- `conversationRef` en useChat se sincroniza manualmente para evitar race conditions
