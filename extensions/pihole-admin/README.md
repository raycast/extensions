# Pi-hole Admin - Raycast Extension

A complete Raycast extension to manage **Pi-hole v6** directly from Raycast. This extension has been completely rewritten to be compatible with Pi-hole v6's new REST API.

## ✨ Características

- 📊 **Dashboard de Estado**: Visualiza estadísticas en tiempo real de Pi-hole
- ⚡ **Control de Bloqueo**: Activa/desactiva Pi-hole con opciones de duración
- 📝 **Registro de Consultas**: Examina consultas DNS con filtros avanzados
- 📈 **Dominios Principales**: Ve los dominios más consultados y bloqueados
- ➕ **Gestión de Dominios**: Agrega dominios a listas blancas y negras
- 🗑️ **Limpiar Registros**: Elimina todos los registros de consultas
- 🔒 **Autenticación Segura**: Compatible con el nuevo sistema de sesiones de Pi-hole v6

## 🚀 Instalación

### Prerrequisitos

- **Pi-hole v6.0 o superior** instalado y funcionando
- **Raycast** instalado en tu Mac
- **Node.js 18+** para desarrollo

### Pasos de Instalación


1. **Configura la extensión**
   - Ve a Raycast Preferences → Extensions → Pi-hole Admin
   - Configura los siguientes parámetros:
     - **URL de Pi-hole**: La URL completa de tu Pi-hole (ej: `http://192.168.1.100` o `https://pi.hole`)
     - **Contraseña Admin**: La contraseña de administrador de Pi-hole
     - **Verificar SSL**: Activa si usas HTTPS con certificados válidos

## 🔧 Configuración de Pi-hole v6

Esta extensión requiere Pi-hole v6 con la nueva API REST. Si tienes una versión anterior, necesitarás actualizar:

```bash
# Actualizar Pi-hole a v6
pihole -up
```

### ⚠️ Configuración Requerida para Múltiples Sesiones (Solo si da problemas la extensión)

Pi-hole v6 por defecto limita las sesiones concurrentes. Para evitar conflictos con la interfaz web mientras usas esta extensión, **debes incrementar el límite de sesiones**:

1. **Edita el archivo de configuración**:
   ```bash
   sudo nano /etc/pihole/pihole.toml
   ```

2. **Modifica la sección `[webserver.api.auth]`**:
   ```toml
   [webserver.api.auth]
   max_sessions = 16  # Cambia a 100 o más (puedes ir probando hasta encontrar la que funcione correctamente)
   ```

3. **Reinicia Pi-hole**:
   ```bash
   sudo systemctl restart pihole-FTL
   ```

### Configuración de HTTPS (Opcional)

Si tu Pi-hole usa HTTPS, asegúrate de:

1. **Con certificados válidos**: Mantén "Verificar SSL" activado
2. **Con certificados autofirmados**: Desactiva "Verificar SSL" en las preferencias

## 📋 Comandos Disponibles

### 🏠 Ver Estado
- **Descripción**: Dashboard principal con estadísticas de Pi-hole
- **Características**:
  - Estado actual (activo/desactivado)
  - Consultas totales y bloqueadas del día
  - Porcentaje de bloqueo
  - Información del sistema

### ⚡ Activar/Desactivar Bloqueo
- **Descripción**: Control completo del estado de Pi-hole
- **Opciones de desactivación**:
  - 5 minutos
  - 30 minutos
  - 1 hora
  - 2 horas
  - Permanente

### 📝 Ver Registro de Consultas
- **Descripción**: Examina las consultas DNS recientes
- **Características**:
  - Filtros por estado (bloqueado/permitido)
  - Búsqueda por dominio, cliente o tipo
  - Información detallada de cada consulta
  - Acciones rápidas desde el registro

### 📊 Dominios Principales
- **Descripción**: Estadísticas de dominios más consultados
- **Vistas disponibles**:
  - Dominios permitidos más consultados
  - Dominios bloqueados más frecuentes
  - Top clientes por número de consultas

### ➕ Agregar Dominio
- **Descripción**: Agrega dominios a listas blancas o negras
- **Características**:
  - Validación de formato de dominio
  - Selección de tipo de lista
  - Campo opcional para comentarios

### 🗑️ Limpiar Registros
- **Descripción**: Elimina todos los registros de consultas
- **Seguridad**: Requiere confirmación antes de ejecutar

## 🔧 Solución de Problemas

### Error de Autenticación
- Verifica que la contraseña sea correcta
- Asegúrate de que Pi-hole v6 esté funcionando
- Verifica la URL de Pi-hole (incluye http:// o https://)

### Error de Conexión
- Confirma que Pi-hole sea accesible desde tu Mac
- Si usas HTTPS, verifica la configuración SSL
- Revisa que no hay firewalls bloqueando la conexión

### Comandos No Aparecen
- Asegúrate de que la extensión esté habilitada en Raycast
- Reinicia Raycast si es necesario
- Verifica que todas las dependencias estén instaladas

## 🌟 Características de Pi-hole v6 Soportadas

- ✅ Nueva API REST
- ✅ Autenticación por sesión (SID)
- ✅ Servidor web embebido
- ✅ Paginación del lado del servidor
- ✅ Configuración consolidada (pihole.toml)
- ✅ Soporte HTTPS nativo

## 🤝 Contribuir

Las contribuciones son bienvenidas. Para contribuir:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -am 'Agrega nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Reconocimientos

- Equipo de [Pi-hole](https://pi-hole.net/) por el excelente software
- Equipo de [Raycast](https://raycast.com/) por la plataforma de extensiones
- Comunidad de desarrolladores que mantienen Pi-hole actualizado

---

**¿Problemas o sugerencias?** Abre un issue en este repositorio. 