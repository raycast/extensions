# App Categorizer (Raycast)

Extensão para categorizar seus aplicativos instalados no Windows e abri-los rapidamente pela categoria.

## Comandos

- **Criar Categoria** — formulário onde você dá um nome e seleciona (via busca) quais apps instalados entram nessa categoria.
- **Pesquisar Categoria** — lista todas as categorias criadas. Em cada uma você pode **Editar** (renomear e ajustar os apps) ou **Excluir**.
- **Invocar** — digite/selecione uma categoria e vai aparecer a lista dos apps daquela categoria. Selecione um para executá-lo.
- **Adicionar App Personalizado** — para jogos (Steam/Epic/etc.) ou qualquer app que não apareça automaticamente na lista de "Criar Categoria". Depois de adicionado aqui, ele passa a aparecer normalmente nos outros comandos.

## Jogos e apps que "abrem e fecham sozinhos"

A maioria dos jogos de Steam, Epic Games, Battle.net etc. **não aparece** na lista automática (que só lista apps registrados como "de primeira classe" no Windows) e, se você apontar direto pro `.exe` deles dentro da pasta do jogo, é comum que abram por um instante e fechem — o jogo espera ser iniciado pelo launcher, não diretamente.

Solução: use o comando **Adicionar App Personalizado** e, em vez do `.exe`, preencha o campo "OU link de launcher" com:

- **Steam:** `steam://rungameid/SEU_APP_ID` — o App ID está na URL da página do jogo na loja Steam (ex: `store.steampowered.com/app/730` → App ID é `730`)
- **Epic Games:** `com.epicgames.launcher://apps/NOME_DO_APP?action=launch`

Isso deixa o próprio launcher cuidar de abrir o jogo corretamente.

**Ícone:** para jogos adicionados via `steam://rungameid/SEU_APP_ID`, a extensão busca automaticamente a capa do jogo direto do CDN da Steam — não precisa fazer nada. Se quiser usar outra imagem (ou for um app de outro launcher), o comando "Adicionar App Personalizado" tem um campo opcional pra você escolher manualmente um arquivo de imagem (.png/.jpg) como ícone.

Para apps comuns (não-jogos) que não aparecem na lista automática, o mesmo comando permite escolher o `.exe` diretamente pelo seletor de arquivo — nesse caso a extensão já cuida de abrir com o diretório de trabalho correto, então não deve fechar sozinho.

## Como instalar e rodar

Pré-requisitos: [Node.js](https://nodejs.org) (LTS) e o [Raycast para Windows](https://www.raycast.com/windows) instalados.

1. Extraia esta pasta em algum lugar do seu PC, por exemplo `C:\Users\SeuUsuario\raycast-app-categorizer`.
2. Abra um terminal (PowerShell ou cmd) dentro dessa pasta.
3. Instale as dependências:
   ```
   npm install
   ```
4. Rode em modo desenvolvimento (isso já registra a extensão no Raycast local):
   ```
   npm run dev
   ```
   (Isso executa `ray develop` — deixe o terminal aberto enquanto usa/testa a extensão.)
5. Abra o Raycast (`Alt+Space`) e procure por "Criar Categoria", "Pesquisar Categoria" ou "Invocar".

## Instalar de forma fixa (sem deixar o PowerShell aberto)

O `npm run dev` é só pra desenvolvimento/testes. Depois de confirmar que tudo funciona, você pode "publicar localmente" a extensão pra ela ficar disponível no Raycast permanentemente, sem depender de nenhum terminal aberto:

1. No mesmo terminal, dentro da pasta do projeto, pare o `npm run dev` (Ctrl+C) se estiver rodando.
2. Rode:
   ```
   npm run build
   ```
3. Abra o Raycast, vá em **Extensions** (na configuração/Settings do Raycast) e use a opção **Import Extension** (ou **Add Local Extension**), apontando pra pasta do projeto (a mesma que tem o `package.json`).
4. Pronto — a extensão fica instalada e ativa mesmo depois de fechar o terminal e reiniciar o PC. Você só precisa reabrir o terminal e rodar `npm run build` de novo se editar o código no futuro.

## Detalhes técnicos

- A extensão usa `getApplications()` da API do Raycast para listar os apps instalados no sistema (Registro do Windows / atalhos do Menu Iniciar são resolvidos internamente pelo Raycast).
- As categorias e a lista de apps de cada uma ficam salvas localmente via `LocalStorage` do Raycast (armazenamento próprio da extensão, não sincronizado por padrão).
- Para executar um app, é usada a função `open()` do Raycast, que dispara o executável associado ao caminho salvo.

## Observações

- O ícone em `assets/icon.png` é um placeholder simples gerado automaticamente — sinta-se à vontade para substituí-lo por um PNG 512x512 de sua preferência.
- Se algum app não aparecer na lista do `getApplications()`, pode ser um app que não está registrado como aplicativo "de primeira classe" no Windows (ex: alguns apps portáteis). Nesse caso, dá pra estender `create-category.tsx` para também aceitar um atalho `.lnk` escolhido manualmente via `Form.FilePicker`.
