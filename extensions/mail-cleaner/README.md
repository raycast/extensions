# Mail Cleaner (extensión local de Raycast)

Extensión personal que lista los correos recientes de tu Bandeja de entrada
(cuentas "Google", "Datita Google" e "iCloud" en Mail.app) y te permite
seleccionar varios para moverlos a la Papelera con un solo atajo.

Usa AppleScript con `whose name is "Papelera"` en vez de la propiedad rota
`trash mailbox of account`, así evita el bug de Mail.app que detectamos.

## Requisitos

- macOS con Mail.app configurada (ya lo tenés).
- [Node.js](https://nodejs.org) 20 o superior instalado. Si no lo tenés:
  ```bash
  brew install node
  ```
- Raycast instalado (ya lo tenés).

## Instalación

1. Descomprimí esta carpeta en algún lugar permanente, por ejemplo:
   ```bash
   mkdir -p ~/raycast-extensions
   mv mail-cleaner ~/raycast-extensions/
   cd ~/raycast-extensions/mail-cleaner
   ```

2. Instalá las dependencias:
   ```bash
   npm install
   ```

3. Iniciá el modo desarrollo (esto la registra en Raycast automáticamente):
   ```bash
   npm run dev
   ```
   Vas a ver un ícono nuevo en la barra de menú de macOS indicando que
   Raycast está en modo desarrollo para esta extensión. Dejá esa terminal
   abierta (podés minimizarla) — mientras esté corriendo, el comando funciona.

4. Abrí Raycast y buscá **"Recent Emails"**. Debería aparecer como parte
   de la extensión "Mail Cleaner".

5. La primera vez que corra, macOS te va a pedir permiso para que la
   Terminal/Raycast controle Mail.app. Aceptá el permiso.

## Uso

- Abrí el comando desde Raycast. Vas a ver los últimos correos de tus
  bandejas de entrada, ordenados del más reciente al más viejo.
- **Enter**: selecciona / deselecciona el correo resaltado (aparece un
  check verde).
- **⌘ + Enter**: mueve todos los correos seleccionados a la papelera
  (te pide confirmación antes).
- **⌘ + Shift + A**: selecciona todos los correos visibles.
- **⌘ + Shift + X**: limpia la selección.
- **⌘ + R**: refresca la lista.
- Podés escribir en la barra de búsqueda para filtrar por asunto o
  remitente.

## Dejarlo corriendo permanentemente

El modo desarrollo (`npm run dev`) requiere que el proceso siga activo
en una terminal. Si querés que ande siempre sin tener una terminal abierta,
tenés que publicarla como extensión privada de tu cuenta de Raycast:

```bash
npx @raycast/api@latest publish
```

Esto la sube a tu organización/cuenta de Raycast como extensión privada
(no pública en el Store), y queda disponible sin depender de `npm run dev`.

## Personalización

Si agregás o quitás cuentas de correo en Mail.app, editá la lista
`ACCOUNTS` en `src/mail.ts` para que coincida con los nombres exactos
de tus cuentas (los mismos que ves en Preferencias → Cuentas en Mail.app).
