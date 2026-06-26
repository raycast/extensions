# GitHub SSH Switcher para Raycast

Extensión de [Raycast](https://raycast.com) para cambiar entre múltiples cuentas GitHub cargando la clave SSH correspondiente en el agente con un solo atajo de teclado.

Útil cuando trabajas con varias identidades GitHub (personal, trabajo, universidad…) desde la misma máquina y necesitas una forma rápida de cambiar entre ellas.

## Cómo funciona

Al seleccionar una cuenta se ejecutan tres pasos en secuencia:

1. **Limpiar** — elimina todas las identidades actuales del agente SSH (`ssh-add -D`)
2. **Cargar** — añade la clave privada de la cuenta al agente (`ssh-add <ruta>`)
3. **Verificar** — comprueba la conexión con GitHub (`ssh -T <alias>`)

Si todo va bien, una notificación toast confirma la cuenta activa. Si algo falla, una vista de detalle muestra exactamente qué paso falló y la salida exacta de SSH, sin salir de Raycast.

## Requisitos

| Requisito | Notas |
|---|---|
| [Raycast](https://raycast.com) | Probado en Raycast 1.x |
| Node.js 18+ | `brew install node` |
| Claves SSH por cuenta GitHub | Un par de claves por cuenta |
| Alias en `~/.ssh/config` | Ver configuración abajo |
| Passphrases en macOS Keychain | Configuración única por clave |

## Configuración

### 1. Generar claves SSH

Si aún no tienes un par de claves para cada cuenta, créalos:

```bash
ssh-keygen -t ed25519 -C "tu-email@ejemplo.com" -f ~/.ssh/id_ed25519_github_trabajo
```

Añade la clave pública a la cuenta de GitHub correspondiente en
**Settings → SSH and GPG keys**.

### 2. Configurar `~/.ssh/config`

Añade un bloque `Host` por cada cuenta. El valor de `Host` es el alias que usa esta extensión; `HostName` debe ser siempre `github.com`:

```
Host github-trabajo
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github_trabajo

Host github-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github_personal

Host github-universidad
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github_universidad
```

Puedes verificar que los alias funcionan desde el terminal:

```bash
ssh -T github-trabajo
# Hi tu-usuario! You've successfully authenticated...
```

### 3. Guardar passphrases en el Keychain de macOS (una vez)

La extensión se ejecuta fuera de la terminal y no puede solicitar passphrases de forma interactiva. Guarda cada passphrase en el Keychain una sola vez:

```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_github_trabajo
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_github_personal
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_github_universidad
```

A partir de entonces `ssh-add` cargará las claves sin ninguna solicitud.
Las claves sin passphrase no requieren este paso.

### 4. Editar `src/accounts.ts`

Abre `src/accounts.ts` y sustituye los ejemplos por tus propias cuentas:

```typescript
export const ACCOUNTS: Account[] = [
  {
    title: "Trabajo",                            // nombre en Raycast
    subtitle: "tu-email@empresa.com",            // mostrado como subtítulo
    keyPath: "~/.ssh/id_ed25519_github_trabajo",
    host: "github-trabajo",                      // debe coincidir con Host en ~/.ssh/config
  },
  {
    title: "Personal",
    subtitle: "tu-usuario-github",
    keyPath: "~/.ssh/id_ed25519_github_personal",
    host: "github-personal",
  },
];
```

## Instalación (modo desarrollo)

```bash
# 1. Clonar el repositorio
git clone https://github.com/ricardoch/raycast-github-ssh-switcher.git
cd raycast-github-ssh-switcher

# 2. Instalar dependencias
npm install

# 3. Iniciar en modo desarrollo
npm run dev
```

`npm run dev` compila la extensión y la registra en Raycast automáticamente.
Cualquier cambio en archivos `.ts` / `.tsx` dispara una recompilación automática.

> **Recarga del icono:** Los assets estáticos (incluido el icono) solo se recargan
> al reiniciar `npm run dev`. Si cambias el icono, detén el proceso (`Ctrl+C`)
> y vuelve a ejecutar `npm run dev`.

## Uso

1. Abre Raycast (`⌘ Espacio`)
2. Busca **Switch GitHub SSH Account**
3. Selecciona la cuenta deseada y pulsa `↵`
4. Una notificación toast confirma el cambio, o abre una vista de detalle con el error si algo falla

## Estructura del proyecto

```
raycast-github-ssh-switcher/
│
├── assets/
│   └── extension-icon.png      # Icono 512×512 RGBA
│
├── media/
│   ├── list-view.png           # Captura: lista de cuentas
│   ├── success-toast.png       # Captura: cambio exitoso
│   └── error-detail.png        # Captura: vista de error
│
├── src/
│   ├── accounts.ts             # Tipo Account + lista ACCOUNTS
│   ├── ssh.ts                  # Utilidades SSH: entorno, ejecución, flujo
│   └── switch-account.tsx      # Comando Raycast: UI de lista + vista de error
│
├── package.json                # Manifiesto de extensión + scripts npm
├── tsconfig.json               # Configuración de TypeScript
├── CHANGELOG.md
├── LICENSE
├── README.md                   # Documentación en inglés
└── README.es.md                # Este archivo
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Compilar y vigilar en modo desarrollo |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run lint` | Lint con la configuración ESLint de Raycast |
| `npm run fix-lint` | Corregir automáticamente problemas de lint |
| `npm run publish` | Publicar en la Raycast Store |

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Error connecting to agent` | `SSH_AUTH_SOCK` no disponible en Raycast | Reinicia Raycast; la extensión consulta `launchctl` como alternativa |
| `No such file or directory` | La ruta de la clave es incorrecta | Revisa `keyPath` en `src/accounts.ts` |
| `Permission denied (publickey)` | Clave incorrecta para esa cuenta GitHub | Verifica que la clave pública esté registrada en GitHub |
| Sin respuesta SSH | La clave tiene passphrase no guardada en Keychain | Ejecuta `ssh-add --apple-use-keychain <clave>` una vez |
| `Could not resolve hostname` | Alias `Host` ausente en `~/.ssh/config` | Añade el bloque `Host` (ver paso 2) |

## Licencia

[MIT](LICENSE) © Ricardo Chocano del Cerro
