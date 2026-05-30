<p align="center">
  <img src="../../assets/local2fa.png" alt="Local 2FA — Gestor TOTP offline para Raycast" width="100%" />
</p>

# Local 2FA para Raycast

<p align="center">
  Gestor de 2FA TOTP local-first y offline para Raycast en macOS.
</p>

<p align="center">
  <a href="../../README.md">English</a> ·
  <a href="./README.es.md">Español</a> ·
  <a href="./README.pt-BR.md">Português (BR)</a> ·
  <a href="./README.de.md">Deutsch</a> ·
  <a href="./README.fr.md">Français</a>
</p>

<p align="center">
  <a href="https://github.com/vayaSEO/local-2fa/releases"><img src="https://img.shields.io/github/v/release/vayaSEO/local-2fa?display_name=tag" alt="Última versión" /></a>
  <a href="https://github.com/vayaSEO/local-2fa/blob/main/LICENSE"><img src="https://img.shields.io/github/license/vayaSEO/local-2fa" alt="Licencia" /></a>
  <a href="https://github.com/vayaSEO/local-2fa/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/vayaSEO/local-2fa/ci.yml?branch=main" alt="CI" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-339933" alt="Node >=20" />
  <img src="https://img.shields.io/badge/local--first-sin%20cloud-informational" alt="Local-first" />
  <img src="https://img.shields.io/badge/crypto-AES--256--GCM-blue" alt="AES-256-GCM" />
</p>

> Proyecto personal open-source. Sin auditoría independiente.

---

## Vista previa

<p align="center">
  <img src="../../metadata/local-2fa-1.png" alt="Vista List Codes" width="850" />
</p>

<p align="center">
  <img src="../../metadata/local-2fa-2.png" alt="Vista Add Account" width="850" />
</p>

<p align="center">
  <img src="../../metadata/local-2fa-3.png" alt="Import from QR Image" width="850" />
</p>

## Por qué existe

- Mantén los secretos 2FA locales en tu Mac.
- Evita la sincronización en la nube y servicios OTP externos.
- Flujo nativo de Raycast rápido para copiar/pegar a diario.

## Características

- Generación de TOTP RFC 6238 (`SHA1`, `SHA256`, `SHA512`)
- 6 u 8 dígitos, periodo configurable
- Almacenamiento local cifrado (`AES-256-GCM`)
- Importación local desde:
  - URL `otpauth://`
  - URL `otpauth-migration://` (export de Google Authenticator)
  - Imágenes QR en PNG (decodificadas localmente, JS puro, sin binarios externos)

## Comandos

- **List Codes** — ver, copiar, pegar y eliminar cuentas
- **Add Account** — flujo unificado:
  - pegar URL `otpauth://`
  - autocompletar campos desde la URL
  - o rellenar manualmente
- **Import Google Migration** — pegar `otpauth-migration://...`
- **Import from QR Image** — seleccionar una o varias imágenes QR PNG locales

## Inicio rápido

Para uso normal solo necesitas Raycast + la extensión instalada.

```bash
npm install
npm run lint
npm test
npm run dev
```

## Requisitos

- macOS
- Raycast
- Node.js 20+

No requiere binarios externos. `Import from QR Image` decodifica PNGs en
JavaScript puro (`qr` + `pngjs`). Reexporta tus QR como PNG si los tienes
en otro formato.

## Modelo de seguridad (corto)

- Cifrado: `AES-256-GCM`
- KDF: `PBKDF2-SHA256` (600.000 iteraciones, OWASP 2023)
- Salt: 16 bytes aleatorios por guardado
- IV: 12 bytes aleatorios por guardado
- Master password: preferencia `password` de Raycast (almacenada en macOS Keychain)
- Versionado de cifrado: v2 actual, retrocompatible transparente con vaults v1 (210k iter)

Modelo de amenazas completo en [SECURITY.md](../../SECURITY.md).

## Aviso de recuperación

Si pierdes tu Master Password, los datos cifrados no se pueden recuperar.
Guarda siempre:

- códigos de recuperación de cada servicio
- secretos / payloads QR originales de alta
- una copia separada de tus credenciales

## Limitaciones

- Sin sincronización en la nube (por diseño)
- Sin sincronización entre dispositivos (por diseño)
- Sin exportación de cuentas todavía

## Contribuir

1. Fork o clone.
2. Crea una rama.
3. Ejecuta `npm run lint && npm test && npm run build`.
4. Abre un PR con un resumen claro del cambio.

Flujo del mantenedor: [MAINTAINERS.md](../../MAINTAINERS.md).

## Reporte de vulnerabilidades

No abras issues públicas para vulnerabilidades de seguridad.
Usa [GitHub Security Advisories](https://github.com/vayaSEO/local-2fa/security/advisories/new)
o contacta a `contacto@davidsitjes.com` en privado.

## Licencia

MIT. Ver [LICENSE](../../LICENSE).
