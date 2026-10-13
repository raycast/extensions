# Vivaldi Links

Abre qualquer link no **Vivaldi**, no perfil certo, sem depender de qual navegador é o padrão do Windows.

- **Enter** — abre em uma **janela nova**.
- **Ctrl+Enter** — abre como **aba na janela que você já está usando**.

A ordem é invertível na preferência **Enter Opens**, e a segunda linha do painel de ações sempre responde a Ctrl+Enter.

## Comandos

| Comando | O que faz |
| --- | --- |
| **Open Link in Vivaldi** | Cole ou digite o link. Se a barra estiver vazia, ele oferece o link que está na área de transferência. |
| **Open Clipboard Link in Vivaldi** | Abre direto o link da área de transferência, sem tela intermediária. |

O primeiro comando funciona como *fallback command* do Raycast: digite a URL na busca principal, escolha "Open Link in Vivaldi" e o texto já chega preenchido.

## O que ele aceita

| Você digita | Ele abre |
| --- | --- |
| `https://vivaldi.com/pt/` | igual |
| `www.stripe.com/br/pricing` | `https://` na frente |
| `linear.app` | `https://linear.app/` |
| `localhost:3000/admin` | `http://` na frente (loopback e IP nunca respondem em https) |
| `api.stripe.com:8080/v1` | `https://` — porta não é confundida com esquema |
| `<https://news.ycombinator.com>` | sem os sinais de citação |
| `[Stripe Docs](https://docs.stripe.com/api)` | só a URL do markdown |
| `C:\Users\...\CLAUDE.md` | `file:///C:/...` |
| `vivaldi://settings`, `mailto:`, `magnet:` | igual |

E o que ele recusa, de propósito:

- `javascript:`, `data:` e `vbscript:` — colar um desses em um navegador executa o script dentro da página aberta.
- `relatorio.pdf` — nome de arquivo nu não vira domínio. Extensões que também são TLD reais (`.sh`, `.zip`, `.mov`, `.dev`) continuam valendo como domínio.
- Frase com espaços — isto abre links, não faz busca.

## Perfil

O seletor no alto da tela lista os perfis do Vivaldi por nome. **Follow Vivaldi** (padrão) usa o perfil que o próprio Vivaldi tem como corrente, que é o da janela na sua frente. A escolha fica gravada entre execuções.

## Por que ele não usa o `open()` do Raycast

Entregar a URL para o shell sempre reaproveita a última janela em foco do navegador **dono do protocolo** — não dá para pedir janela nova, e nem garante que o navegador será o Vivaldi. A extensão executa o `vivaldi.exe` direto, com argumentos em array e sem `shell: true`, então a URL nunca pode ser reinterpretada como comando.

Dois cuidados que não são opcionais no Windows:

1. **`--user-data-dir` sempre explícito.** O Raycast é empacotado (MSIX) e o processo filho pode herdar um `%LOCALAPPDATA%` redirecionado para dentro de `...\AppData\Local\Temp`. O Chromium deriva a pasta de dados dessa variável — sem cravar o caminho, ele cria um Vivaldi novo e vazio, sem conta, sem tema e sem sessão.
2. **`--profile-directory` sempre explícito.** Sem ele, o Vivaldi abre o último perfil usado, que com vários perfis raramente é o pretendido.

## Instalar

```bash
npm install
npm run dev     # registra como extensão de desenvolvimento; pode ser encerrado depois
```

Extensão de desenvolvimento **não** atualiza sozinha e roda a partir desta pasta — mover ou apagar a pasta quebra a extensão.
