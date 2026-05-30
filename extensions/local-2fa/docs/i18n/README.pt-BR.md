<p align="center">
  <img src="../../assets/local2fa.png" alt="Local 2FA — Gerenciador TOTP offline para Raycast" width="100%" />
</p>

# Local 2FA para Raycast

<p align="center">
  Gerenciador 2FA TOTP local-first e offline para Raycast no macOS.
</p>

<p align="center">
  <a href="../../README.md">English</a> ·
  <a href="./README.es.md">Español</a> ·
  <a href="./README.pt-BR.md">Português (BR)</a> ·
  <a href="./README.de.md">Deutsch</a> ·
  <a href="./README.fr.md">Français</a>
</p>

<p align="center">
  <a href="https://github.com/vayaSEO/local-2fa/releases"><img src="https://img.shields.io/github/v/release/vayaSEO/local-2fa?display_name=tag" alt="Última versão" /></a>
  <a href="https://github.com/vayaSEO/local-2fa/blob/main/LICENSE"><img src="https://img.shields.io/github/license/vayaSEO/local-2fa" alt="Licença" /></a>
  <a href="https://github.com/vayaSEO/local-2fa/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/vayaSEO/local-2fa/ci.yml?branch=main" alt="CI" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-339933" alt="Node >=20" />
  <img src="https://img.shields.io/badge/local--first-sem%20cloud-informational" alt="Local-first" />
  <img src="https://img.shields.io/badge/crypto-AES--256--GCM-blue" alt="AES-256-GCM" />
</p>

> Projeto pessoal open-source. Sem auditoria independente.

---

## Prévia

<p align="center">
  <img src="../../metadata/local-2fa-1.png" alt="Tela List Codes" width="850" />
</p>

<p align="center">
  <img src="../../metadata/local-2fa-2.png" alt="Tela Add Account" width="850" />
</p>

<p align="center">
  <img src="../../metadata/local-2fa-3.png" alt="Import from QR Image" width="850" />
</p>

## Por que existe

- Mantenha os segredos 2FA locais no seu Mac.
- Evite sincronização na nuvem e serviços OTP externos.
- Fluxo nativo do Raycast rápido para copiar/colar no dia a dia.

## Funcionalidades

- Geração TOTP RFC 6238 (`SHA1`, `SHA256`, `SHA512`)
- 6 ou 8 dígitos, período configurável
- Armazenamento local criptografado (`AES-256-GCM`)
- Importação local de:
  - URL `otpauth://`
  - URL `otpauth-migration://` (export do Google Authenticator)
  - Imagens QR em PNG (decodificadas localmente, JS puro, sem binários externos)

## Comandos

- **List Codes** — visualizar, copiar, colar e remover contas
- **Add Account** — fluxo unificado:
  - colar URL `otpauth://`
  - preencher campos a partir da URL
  - ou preencher manualmente
- **Import Google Migration** — colar `otpauth-migration://...`
- **Import from QR Image** — selecionar uma ou mais imagens QR PNG locais

## Início rápido

Para uso normal você só precisa do Raycast + extensão instalada.

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

Não requer binários externos. `Import from QR Image` decodifica PNGs em
JavaScript puro (`qr` + `pngjs`). Reexporte seus QR como PNG se estiverem
em outro formato.

## Modelo de segurança (resumo)

- Criptografia: `AES-256-GCM`
- KDF: `PBKDF2-SHA256` (600.000 iterações, OWASP 2023)
- Salt: 16 bytes aleatórios por save
- IV: 12 bytes aleatórios por save
- Master password: preferência `password` do Raycast (armazenada no macOS Keychain)
- Versionamento de criptografia: v2 atual, retrocompatível transparente com vaults v1 (210k iter)

Modelo de ameaças completo em [SECURITY.md](../../SECURITY.md).

## Aviso de recuperação

Se você perder a Master Password, os dados criptografados não podem ser recuperados.
Mantenha sempre:

- códigos de recuperação de cada serviço
- segredos / payloads QR originais
- backup separado das suas credenciais

## Limitações

- Sem sincronização na nuvem (por design)
- Sem sincronização entre dispositivos (por design)
- Sem exportação de contas ainda

## Contribuindo

1. Fork ou clone.
2. Crie uma branch.
3. Rode `npm run lint && npm test && npm run build`.
4. Abra um PR com resumo claro da mudança.

Fluxo do mantenedor: [MAINTAINERS.md](../../MAINTAINERS.md).

## Reporte de vulnerabilidades

Não abra issues públicas para vulnerabilidades de segurança.
Use [GitHub Security Advisories](https://github.com/vayaSEO/local-2fa/security/advisories/new)
ou contate `contacto@davidsitjes.com` em privado.

## Licença

MIT. Ver [LICENSE](../../LICENSE).
