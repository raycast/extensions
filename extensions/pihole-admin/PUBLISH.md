# 📦 Guía de Publicación - Pi-hole Admin para Raycast Store

## ✅ Preparación Pre-Publicación Completada

### Datos Personales Eliminados
- ✅ Author en `package.json` cambiado de "robert" a "raycast-community"
- ✅ No hay IPs hardcodeadas (solo ejemplos genéricos)
- ✅ No hay contraseñas o configuraciones personales en el código
- ✅ Logs de debug eliminados (solo quedan logs necesarios)

### Problemas Técnicos Resueltos
- ✅ Shortcut reservado `Cmd+W` eliminado del componente add-domain
- ✅ Shortcut reservado `Escape` eliminado del componente add-domain
- ✅ Warnings de shortcuts reservados resueltos

## 📋 Checklist Pre-Publicación

### Archivos Requeridos
- [x] `package.json` - Configuración completa
- [x] `README.md` - Documentación completa en español
- [x] `CHANGELOG.md` - Historial de cambios
- [ ] `assets/pihole-icon.png` - **¡PENDIENTE!** (512x512px)
- [x] `src/` - Código fuente completo
- [x] `.gitignore` - Configurado correctamente

### 🚨 ICONO REQUERIDO

**DEBES agregar el icono antes de publicar:**

1. **Descarga el icono oficial de Pi-hole**:
   - Visita: https://github.com/pi-hole/AdminLTE/tree/master/img
   - O crea uno siguiendo las brand guidelines: https://pi-hole.net/brand-guidelines/

2. **Especificaciones**:
   - Nombre: `pihole-icon.png`
   - Ubicación: `assets/pihole-icon.png`
   - Tamaño: 512x512 píxeles
   - Formato: PNG con fondo transparente

3. **Verifica en package.json**:
   ```json
   "icon": "pihole-icon.png"
   ```

## 🚀 Proceso de Publicación

### 1. Verificación Final
```bash
# Verifica que todo compila
npm run build

# Ejecuta linting
npm run lint

# Prueba en desarrollo
npm run dev
```

### 2. Publicar en Raycast Store
```bash
# Asegúrate de estar logueado en Raycast CLI
npx @raycast/api@latest login

# Publica la extensión
npm run publish
```

### 3. Información para el Store

**Título**: Pi-hole Admin  
**Descripción**: Administra tu Pi-hole v6 directamente desde Raycast  
**Categorías**: Developer Tools, System  
**Keywords**: pihole, dns, admin, network, blocking, security

## 📝 Notas Importantes para Usuarios

### Configuración Obligatoria Pi-hole v6

**Los usuarios DEBEN configurar `max_sessions` antes de usar la extensión:**

```toml
# /etc/pihole/pihole.toml
[webserver.api.auth]
max_sessions = 10  # Aumentar de 1 (por defecto)
```

Sin esta configuración, los usuarios experimentarán:
- Conflictos entre la extensión y la interfaz web
- Sesiones que se cierran inesperadamente
- Errores de autenticación intermitentes

### Compatibilidad

- ✅ **Pi-hole v6.0+**: Totalmente compatible
- ❌ **Pi-hole v5.x**: NO compatible (API diferente)
- ✅ **Raycast**: Requiere versión actual
- ✅ **macOS**: Todas las versiones soportadas por Raycast

## 🏷️ Archivos NO Incluir en Publicación

El `.gitignore` ya excluye correctamente:
- `node_modules/` - **NO incluir** (muy pesado, se instala automáticamente)
- `dist/` - NO incluir (se genera automáticamente)
- `.env*` - NO incluir (archivos de configuración local)

**INCLUIR en publicación:**
- `package-lock.json` - **SÍ incluir** (garantiza versiones exactas de dependencias)

## 📊 Estadísticas del Proyecto

- **Líneas de código**: ~800 líneas TypeScript
- **Componentes**: 6 comandos principales
- **APIs soportadas**: Pi-hole v6 REST API
- **Características**: 15+ funcionalidades principales
- **Idioma**: Español (interfaz completa)

## 🎯 Post-Publicación

1. **Monitorear reviews** en Raycast Store
2. **Responder issues** en GitHub (si aplica)
3. **Actualizar** cuando Pi-hole lance nuevas versiones
4. **Documentar** problemas comunes en README

---

**¿Listo para publicar?** ✅ Sí, después de agregar el icono  
**Archivos sensibles**: ✅ Todos eliminados  
**Configuración**: ✅ Documentada completamente 