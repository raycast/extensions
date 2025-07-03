# Changelog

Todos los cambios notables de esta extensión serán documentados en este archivo.

## [1.0.0] - 2025-01-XX

### Agregado
- ✨ **Soporte completo para Pi-hole v6**: Integración con la nueva API REST
- 📊 **Dashboard de Estado**: Visualización completa de estadísticas de Pi-hole
- ⚡ **Control de Bloqueo**: Activar/desactivar con opciones de duración (5min, 30min, 1h, 2h, permanente)
- 📝 **Registro de Consultas**: Visualización filtrable del registro DNS con búsqueda
- 📈 **Dominios Principales**: Estadísticas de dominios más consultados y bloqueados
- 👥 **Top Clientes**: Vista de clientes con más consultas DNS
- ➕ **Agregar Dominios**: Formulario para agregar dominios a listas blancas/negras
- 🗑️ **Limpiar Registros**: Comando para eliminar todos los registros con confirmación
- 🔒 **Autenticación Segura**: Sistema de autenticación por sesión (SID) de Pi-hole v6
- 🌓 **Soporte SSL**: Opción para verificar/ignorar certificados SSL
- 🎨 **Interfaz en Español**: Toda la interfaz traducida al español
- ⌨️ **Atajos de Teclado**: Shortcuts para acciones comunes (Cmd+R para actualizar, etc.)
- 🔍 **Búsqueda Avanzada**: Filtros por estado, dominio, cliente en registros
- 📱 **UX Optimizada**: Interfaces diseñadas específicamente para Raycast

### Características Técnicas
- 🔄 **Manejo de Sesiones**: Renovación automática de sesiones expiradas
- 🚀 **Cache Inteligente**: Uso de `useCachedPromise` para mejor rendimiento
- 🛡️ **Validación de Datos**: Validación de formato de dominios y URLs
- 📦 **TypeScript**: Código completamente tipado para mayor robustez
- 🧪 **Error Handling**: Manejo comprehensivo de errores con mensajes informativos

### Notas de Migración
- Esta extensión requiere **Pi-hole v6.0 o superior**
- Los usuarios de Pi-hole v5 deben actualizar antes de usar esta extensión
- La extensión original "pie-for-pihole" no es compatible con Pi-hole v6

---

**Nota**: Esta es una reescritura completa de la extensión original para Pi-hole v6. No mantiene compatibilidad con versiones anteriores de Pi-hole debido a los cambios fundamentales en la API. 