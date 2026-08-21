# Checklist manual — a conversa contínua

**Para quem está no teclado.** Este é o único item que não dá para automatizar: no Windows a janela
do Raycast é desenhada pelo `Raycast.UIAccess.exe` e **não aparece em captura de tela** nesta
máquina.

A extensão vale para macOS e Windows. Os cenários abaixo foram percorridos no **Windows 11**; a
seção **macOS** existe justamente porque lá nada foi percorrido ainda.

Antes de marcar qualquer cenário de integração, inicie o Hermes e confirme que ele responde
`platform: "hermes-agent"` em `http://127.0.0.1:8642` (ou registre a porta descoberta). A
checagem automatizada não substitui essa validação manual.

Para abrir o comando direto, sem procurar na busca:

```bash
powershell -c "Start-Process 'raycast://extensions/savio22/hermes/ask-hermes'"
```

O `savio22` aí é o `author` do `package.json`, que virou o namespace do deeplink. Ele mudou de
`sam` para `savio22` em 2026-08-21, para bater com a conta da Raycast Store. **Se um `npm run dev`
antigo ainda estiver registrado, o Raycast pode continuar atendendo pelo caminho velho e ignorar o
novo** — rode `npm run dev` de novo antes de concluir que o deeplink quebrou.

---

## Os quatro pontos críticos — faça estes primeiro

Nunca foram exercitados e são os mais prováveis de precisar de ajuste.

### C1. Fluidez com conversa longa

1. Abra `Conversas do Hermes` e entre na conversa `20260818_173215_4af30a` (330 mensagens) com
   `Enter` (`Continuar esta conversa`).
2. Mande uma pergunta curta e **olhe a lista enquanto ela responde**.

**O que observar:** a lista inteira repinta a cada atualização de texto, porque `isShowingDetail`
está ligado. O texto deve crescer em passos visíveis (~12 por segundo), sem engasgo, sem a seleção
piscando e sem atraso ao apertar as setas.

**Se engasgar:** baixe `RENDER_TURN_LIMIT` em `src/hooks/use-conversation.ts` (hoje `40`). É uma
constante só, e é ela que cai **antes** de qualquer outra coisa ser mexida. Tente `20`, depois `12`.

- [ ] passou sem engasgo
- [ ] engasgou — `RENDER_TURN_LIMIT` baixado para: ______

### C2. A seleção brigando com as setas

1. Mande uma pergunta.
2. **Enquanto ela responde**, aperte ↑ e ↓ várias vezes.

**O esperado:** a seleção estaciona no turno novo enquanto ele responde e é **solta** quando ele
termina; daí em diante as setas navegam livres.

**O defeito a procurar:** a seleção pular de volta sozinha, ou as setas não responderem. Se
acontecer, o problema é o `selectedItemId` (raycast/extensions#10844), não o seu teclado.

- [ ] a seleção estaciona durante a resposta
- [ ] as setas navegam livres depois que o turno termina

### C3. A fila

1. Mande uma pergunta.
2. **Sem esperar**, escreva outra e aperte `Enter`.

**O esperado:** a segunda aparece na hora como turno novo, no fim da lista, com o rótulo
`Preparando`, e a barra é limpa. Quando a primeira termina, a segunda **dispara sozinha**.

Depois, o caminho triste:

3. Mande uma pergunta, enfileire outra, e **pare** a primeira (`Ctrl+Shift+P`).
4. A enfileirada **não** pode disparar. Ela fica com o rótulo `Cancelado` e a linha
   `Esta mensagem não chegou a ser enviada porque a resposta anterior não terminou.`, com
   `Tentar novamente` disponível.

E a remoção:

5. Enfileire uma e use `Remover da fila` (`Ctrl+D`) — some sem confirmação.
6. Enfileire outra e use `Editar antes de enviar` — o texto volta para a barra.

- [ ] a segunda entra como `Preparando` e dispara sozinha
- [ ] parar a primeira **não** dispara a fila
- [ ] `Remover da fila` e `Editar antes de enviar` funcionam

### C4. Navegação só por teclado (item 13 do checklist do projeto)

Sem tocar no mouse, em nenhum momento:

- [ ] abrir os 15 comandos do manifesto, chegar ao resultado e voltar
- [ ] em cada tela, `Ctrl+K` lista **todas** as ações daquele contexto
- [ ] nenhuma ação existe só como atalho, sem entrada no painel
- [ ] no `Escrever mensagem longa`: `Tab` percorre os campos, `Ctrl+Enter` envia, `Esc` volta
- [ ] no `confirmAlert` de excluir conversa: `Enter` aciona a primária, `Esc` cancela
- [ ] o Toast com ação (`Esta conversa já está no Hermes Desktop`) responde ao atalho sem tirar o
      foco da lista

**A forma `{ Windows, macOS }` já não é suspeita — foi conferida no runtime, não no teclado.**
Os atalhos customizados deixaram de ser um objeto simples e passaram a ser declarados por sistema
(`perPlatform({ Windows }, { macOS })`, em `src/components/shortcuts.ts`). A pergunta era se o
aplicativo do Raycast 2.0.3 honra essa forma, já que um atalho que ele não entenda é ignorado em
silêncio. Honra, e a prova está no arquivo que o próprio app injeta quando a extensão faz
`import { Keyboard } from "@raycast/api"`:

    C:\Program Files\WindowsApps\Raycast.Raycast_2.0.3.0_x64__qypenmj9wpt2a      Raycastpi

ode_modules\@raycastpi\index.js

Nele, (a) o validador de atalho aceita explicitamente `{ modifiers, key }`, `{ macOS, Windows }` e
`{ macOS, windows }`; (b) **todos** os `Keyboard.Shortcut.Common.*` são declarados nessa mesma forma
`{ macOS, Windows }` — ou seja, é o caminho que o app usa para si mesmo; (c) a comparação com os
atalhos reservados desmonta os dois blocos. Não há como a forma ser ignorada sem que os `Common.*`
parem de funcionar junto.

Ainda assim vale disparar meia dúzia pelo teclado, porque isso custa um minuto e cobre o que
nenhuma leitura cobre — o atalho chegar à ação certa:

- [ ] `Ctrl+T` (`Ver etapas`), `Ctrl+Shift+P` (`Parar`) e `Ctrl+Shift+Enter`
      (`Continuar esta conversa`) continuam funcionando
- [ ] `Ctrl+Shift+A` (`Abrir configurações`) e `Ctrl+Alt+C` (`Copiar detalhes técnicos`) idem
- [ ] `Alt+Shift+E` / `Alt+Shift+S` na tela de aprovação idem
- [ ] se algum tiver sumido do painel ou parado de responder, registre aqui a versão do Raycast:
      seria a evidência contra a leitura acima, e aí sim `shortcuts.ts` volta a objetos simples

---

## Os 13 itens do checklist do projeto

- [ ] **1. primeiro uso sem configuração** — apague a chave nas preferências da extensão e abra
      `Perguntar ao Hermes`. Tem que cair na tela `Conecte o Raycast ao seu Hermes`, nunca num erro
      de rede.
- [ ] **2. conexão válida** — `Verificar conexão com Hermes` mostra `Tudo certo`.
- [ ] **3. chave inválida** — troque a chave por lixo. O erro é E2, e a **primeira** ação tem que ser
      `Detectar configuração automaticamente`, não `Tentar novamente`.
- [ ] **4. Hermes desligado** — pare o Hermes e pergunte. E1, com a frase exata
      `Não foi possível conectar ao Hermes. Verifique se o Hermes API Server está ativo e se a URL e a chave estão corretas.`
- [ ] **5. pergunta curta** — conversa nova, uma pergunta, resposta completa. Confira que ela
      aparece em Recentes no Hermes Desktop.
- [ ] **6. resposta em streaming** — o texto cresce em passos; `_Preparando…_` vira
      `_O Hermes está pensando…_` depois de 3 s. Em conversa longa isso leva ~5,5 s e é normal.
- [ ] **7. interrupção de run** — `Parar` (`Ctrl+Shift+P`) durante a resposta. O aviso
      `Pedido de parada enviado…` aparece, o estado vira `Interrompendo` e depois `Cancelado`, e o
      texto parcial **fica**.
- [ ] **8. pedido de aprovação** — peça algo que exija comando no computador. O turno mostra o bloco
      🔐 e a ação `Responder pedido de aprovação`. Aprove uma vez e negue outra.
- [ ] **9. lista vazia** — sem conversa nenhuma, `Perguntar ao Hermes` abre em `Comece a conversa` e
      **`Enter` na barra vazia mostra `Escreva sua pergunta.`, sem enviar nada**.
- [ ] **10. sessão com muitas mensagens** — é o C1 acima. Confira também
      `Carregar parte anterior da conversa` (`Ctrl+Shift+H`) e o item do topo com o subtítulo
      `Traz as 40 trocas anteriores a estas.`
- [ ] **11. erro de rede durante streaming** — pare o Hermes **no meio** de uma resposta. O texto já
      recebido fica; o bloco de erro entra abaixo; `Acompanhar de novo` (`Ctrl+R`) aparece se der
      para reassinar.
- [ ] **12. cópia e colagem de resposta** — `Ctrl+Shift+C` (HUD `Resposta copiada`) e
      `Ctrl+Shift+V` em outro aplicativo (HUD `Resposta colada`).
- [ ] **13. navegação completa somente por teclado** — é o C4 acima.

---

## Extras desta tela que valem um olhar

- [ ] **Fechar a janela no meio da resposta e reabrir.** A tarefa **continua rodando** (D-02). Ao
      voltar, o turno é reanexado à mesma execução (sem novo envio), o resultado final chega e
      qualquer mensagem ainda enfileirada reaparece na conversa certa.
- [ ] **Trocar durante escolha de modelo e durante stream.** O resultado da conversa antiga não
      pode aparecer na nova; a pergunta continua pertencendo à conversa original e a tarefa
      antiga continua em `Execuções do Hermes`.
- [ ] **Continuar durante tarefa ativa.** Enquanto uma execução estiver `Preparando`, `Executando`,
      `Aguardando aprovação` ou `Interrompendo`, a ação `Continuar esta conversa` não aparece.
      Ela só volta depois de `Concluído`, `Cancelado`, `Falhou` ou `Execução expirada`.
- [ ] **Parar e enviar de novo imediatamente.** A nova pergunta permanece na fila e não recebe
      `Cancelado` junto com itens bloqueados pelo cancelamento anterior.
- [ ] **Retenção terminal.** Criar mais de 20 execuções concluídas e confirmar que uma execução
      ativa continua visível na lista.
- [ ] **Automações sem autorização.** Provocar HTTP 401 e confirmar a tela de primeiro uso com
      ação de detecção/configuração; HTTP 501 continua explicando indisponibilidade.
- [ ] **Clipboard hostil.** Testar emoji, texto misto, 20.000+ caracteres e instruções maliciosas;
      o prompt delimita o conteúdo, preserva início/fim e comunica o corte.
- [ ] **Trocar de conversa pelo seletor da barra com uma mensagem na fila.** Tem que aparecer o
      `confirmAlert` `Descartar as mensagens que ainda não foram enviadas?`. Recusando, o seletor
      precisa **voltar a exibir a conversa real** — se ele ficar mostrando a conversa que você não
      abriu, é defeito.
- [ ] **O rascunho da barra sobrevive à troca de conversa.** Escreva sem enviar, troque de conversa:
      o texto continua lá.
- [ ] **`Ctrl+T`** alterna Resposta/Etapas e as etapas mostram as linhas com emoji.
- [ ] **`Ctrl+Shift+D`** abre `Ver mensagens e ferramentas` a partir da conversa e da lista — e
      **nunca** aparece junto de `Detectar configuração automaticamente` no mesmo painel.
- [ ] **`Modelos do Hermes`** → `Usar só na próxima pergunta` (`Ctrl+Shift+M`). Volte para a
      conversa, pergunte, e confira o campo `Modelo` do painel. A pergunta seguinte volta ao padrão.

---

## Primeiro uso — a sondagem de presença (§3.4)

A tela de boas-vindas agora diz o que encontrou **antes** de você apertar Enter. Para exercitar os
dois desfechos é preciso apagar a chave guardada: `Configurar Hermes` →
`Esquecer a chave detectada` (`Ctrl+D`), e o campo `Chave do Hermes` das configurações precisa
estar **vazio** — se ele tiver algo, a preferência vence (§3.3) e a tela nem aparece.

- [ ] **Hermes ligado.** Abra `Perguntar ao Hermes`. A tela mostra por um instante
      `Procurando o Hermes neste computador…` e então
      `Achei o Hermes 0.20.4 aqui, em 127.0.0.1:8642. Falta só a chave de acesso.`
      `Enter` conecta e `Continuar` volta para a pergunta.
- [ ] **Hermes desligado.** Pare o Hermes e reabra o comando. A linha vira
      `O Hermes não respondeu neste computador. Ligue o Hermes antes de continuar…` — **antes** de
      qualquer Enter. É o ponto todo da mudança: o usuário descobre agora, não depois da detecção
      falhar e descartar a chave que ela tinha achado.
- [ ] **Endereço errado.** Preencha `Endereço do Hermes` com `127.0.0.1:8644` (o adaptador de
      webhook). A linha vira `Tem um programa respondendo nesse endereço, mas não é o Hermes.`
      Limpe o campo depois.

## Primeiro uso — chave recusada (E2, §5.2)

- [ ] Com a extensão já conectada, troque a `API_SERVER_KEY` do Hermes e reinicie o Hermes. Abra
      `Conversas do Hermes`: a tela de erro E2 tem `Detectar configuração automaticamente` como
      **primeira** ação, e ela resolve sem passar por `Tentar novamente`.
- [ ] Nessa mesma tela, confira que **não** existe `Ver mensagens e ferramentas` no painel — as
      duas dividem `Ctrl+Shift+D` e nunca podem coexistir (`components/shortcuts.ts`).

## macOS — nunca foi rodado (faça esta seção inteira num Mac)

Esta seção existe porque a extensão passou a ser declarada para os dois sistemas
(`"platforms": ["macOS", "Windows"]`) **sem que ninguém tenha aberto ela num Mac**. Os testes
automatizados cobrem os dois caminhos de código injetando a plataforma, e é exatamente por isso que
eles não substituem esta lista: nada aqui é sobre a lógica, e sim sobre o que o sistema faz com ela.

Antes de começar, confirme que o Hermes está rodando no Mac e que a pasta `~/.hermes` existe.

### M1. Descoberta em `~/.hermes`

- [ ] Com a preferência `Endereço do Hermes` **em branco**, abra `Verificar conexão com Hermes`. Ele
      precisa achar o Hermes sozinho e mostrar `127.0.0.1` com a porta certa.
- [ ] Em `Configurar Hermes` → `Detectar configuração automaticamente`, a tela deve citar
      `/Users/<voce>/.hermes` como a pasta procurada — nunca um caminho com `AppData`.
- [ ] Renomeie `~/.hermes` por um instante (ou rode com `HERMES_HOME` apontando para outro lugar) e
      confirme que a extensão usa o `HERMES_HOME`, não o padrão.

### M2. Configuração manual com os programas do Mac

- [ ] Em `Configurar manualmente`, o passo a passo precisa dizer **Finder** e **TextEdit**, e a tecla
      de procurar precisa ser `Cmd+F`. Se aparecer "Bloco de Notas" ou "Ctrl+F", é bug.
- [ ] A dica de arquivos ocultos precisa ser a do Finder (`Cmd+Shift+.`).
- [ ] A ação `Abrir a pasta do Hermes` precisa abrir o **Finder** na pasta certa — e a pasta, nunca
      o arquivo `.env`.

### M3. O deep link `hermes://` (o ponto mais provável de falhar)

O esquema é registrado pelo Hermes Desktop através do `Info.plist` do app. Nada disso foi verificado
ao vivo no macOS: no Windows a verificação foi feita e está registrada como V-2.

- [ ] Com o Hermes Desktop **aberto**, use `Abrir no Hermes Desktop` numa conversa. O app deve focar
      exatamente aquela conversa.
- [ ] Com o Hermes Desktop **fechado**, use a mesma ação. O esperado é o app abrir; se nada
      acontecer, a extensão precisa dizer "Não consegui abrir o Hermes Desktop" — e **não** falhar
      em silêncio nem mostrar erro em inglês.
- [ ] Confirme que `Copiar identificador da conversa` continua no painel como saída manual.

### M4. Os atalhos com `Cmd`

Todos os atalhos customizados foram escolhidos lendo as tabelas do Raycast, não usando um Mac. O que
interessa aqui é colisão: um atalho que o sistema ou o Raycast já reserva simplesmente não funciona,
e nada avisa.

**Metade disso já está resolvida por teste.** `tests/shortcuts.test.ts` resolve os 28 atalhos para
teclas concretas nos dois sistemas e reprova se algum encostar noutro ou na lista `Reserved` do
Raycast — que veio do runtime do app, não da documentação. O que sobra para o Mac é o que aquela
lista **não** cobre: as teclas que o macOS reserva para si, fora do Raycast.

- [ ] `Cmd+T` (`Ver etapas` / `Ver resposta`) dentro de uma execução.
- [ ] `Cmd+Shift+Enter` (`Continuar esta conversa`) na lista de conversas.
- [ ] `Cmd+Shift+P` (`Parar`) numa execução em andamento. (A versão anterior deste passo mandava
      confirmar que era a mesma tecla do `Common.Pin`. Não é: `Common.Pin` é `Cmd+.`. Ignore
      qualquer nota antiga sobre essa colisão — ela nunca existiu.)
- [ ] `Cmd+Shift+H` (`Carregar parte anterior da conversa`) numa conversa longa — `Cmd+H` sozinho
      esconde aplicativo no macOS, então é o mais suspeito da lista.
- [ ] `Cmd+Opt+C` (`Copiar detalhes técnicos`) numa tela de erro.
- [ ] `Opt+Shift+E` e `Opt+Shift+S` numa tela de aprovação.
- [ ] `Cmd+Shift+A` (`Abrir configurações`) em qualquer tela.
- [ ] Para cada um que falhar, anote a ação e o atalho: a correção é uma linha em
      `src/components/shortcuts.ts`, no bloco `macOS`.

### M5. Texto, clipboard e formulários

- [ ] `Perguntar sobre seleção` com um trecho selecionado numa janela qualquer.
- [ ] O mesmo comando **sem** seleção e **sem** nada copiado: o estado vazio precisa dizer `Cmd+C`,
      nunca `Ctrl+C`, e não pode afirmar que a limitação é do Windows.
- [ ] `Escrever mensagem longa`: a dica precisa dizer `Cmd+Enter`, e `Cmd+Enter` precisa enviar.
- [ ] `Colar última resposta` com o cursor num campo de texto de outro aplicativo.

### M6. Escopo de memória

- [ ] Nas preferências, `Escopo de memória` deve estar **vazio**, com o texto de apoio
      "Padrão do sistema".
- [ ] Faça uma pergunta e confirme no Hermes que o cabeçalho `X-Hermes-Session-Key` chegou como
      `raycast:macos:default`. Uma instalação de macOS não pode herdar `raycast:windows:default`.

## Publicação — o GIF e as capturas de tela

Nada disto pode ser gerado por automação nesta máquina: a janela do Raycast é desenhada pelo
`Raycast.UIAccess.exe` e sai em branco em qualquer captura feita por script ou por
`Print Screen`. Precisa ser você, no teclado.

A exceção é o **próprio Raycast**, que se captura pela API de captura do Windows e por isso
enxerga a própria janela. É o caminho das capturas da Store, mais abaixo. Para o GIF não há
exceção nenhuma.

### O cuidado que nenhum grep pega

Toda gravação e toda captura mostram a tela de verdade. **Antes de gravar, olhe o que está
visível** — principalmente na lista lateral do Hermes Desktop. Nome de cliente, assunto pessoal,
qualquer conteúdo real vaza para o arquivo e **fica no histórico do git para sempre**, mesmo que
você troque a imagem depois. Se der, grave com um perfil limpo do Hermes.

### O GIF da demonstração (README)

30 a 45 segundos, nesta ordem:

- [ ] abrir o Raycast pelo atalho (mostre o atalho acontecendo, não a janela já aberta)
- [ ] **Perguntar ao Hermes** com uma pergunta curta e de resposta rápida
- [ ] a resposta chegando em streaming — é o momento que vende a extensão
- [ ] abrir a **mesma conversa** no Hermes Desktop, provando que é o mesmo histórico

Salve em `assets/demo.gif` e troque o comentário HTML do `README.md` (procure por
`Demo GIF goes here`) pela linha `![Demo](assets/demo.gif)`. Faça o mesmo no `README.pt-BR.md`.

### Capturas para o README

Três bastam, em `assets/`, com nomes descritivos (`screenshot-ask.png` e afins):

- [ ] **Perguntar ao Hermes** com uma resposta pronta
- [ ] **Conversas do Hermes** com a lista
- [ ] **Execuções do Hermes** com uma aprovação pendente

### Capturas para a Raycast Store

Requisitos próprios, diferentes dos do README. Formato: **PNG, 2000×1250** (proporção 16:10),
nomeadas `hermes-1.png` … `hermes-6.png`, na pasta `metadata/` na raiz do projeto.

**O Raycast do Windows produz esse arquivo sozinho.** O parágrafo acima, sobre a janela não
aparecer em captura, vale para `Print Screen` e para automação — não para o próprio app, que
captura a si mesmo pela API de captura do Windows. Ver [D-17](DECISOES-VERIFICADAS.md) para
onde cada afirmação abaixo foi lida no binário do Raycast 2.0.3.

1. Deixe `npm run dev` rodando. A extensão registrada em
   `~/.config/raycast/extensions/hermes` é a que o app enxerga, e ela pode estar velha.
2. Em `Settings › Extensions`, procure o comando **`Capture Window`** e grave um atalho nele
   (botão `Record Hotkey`). Sem atalho não dá: o comando só sabe para qual pasta `metadata/`
   salvar se for disparado **enquanto a janela já está dentro de um comando da extensão**, e
   ir até a busca para digitar o nome do comando já tira você de lá.
3. Abra o comando da extensão, deixe a tela do jeito que ela deve aparecer, e aperte o atalho.
4. No painel de captura que abre, use **`Save for Store`**. É essa opção que grava
   2000×1250 direto em `metadata/`.

Se `Save for Store` não aparecer (atalho disparado fora de um comando da extensão, ou `dev`
não rodando), sobra o caminho manual: capture como der, e depois

```bash
node tools-capturas.mjs ajustar "C:/caminho/da/captura.png"
```

A ferramenta centraliza a imagem em 2000×1250 sobre fundo sólido — ela **nunca amplia**, para
não entregar captura borrada à revisão. Confira o resultado com `node tools-capturas.mjs`
(modo `conferir`), que lê o IHDR do mesmo jeito que o validador do CLI.

- [ ] `hermes-1.png` — `Perguntar ao Hermes` com uma resposta pronta na tela. **É esta que
      aparece na listagem da Store**, então é a que precisa explicar a extensão sozinha.
- [ ] `hermes-2.png` — `Conversas do Hermes`, lista com várias conversas e o detalhe aberto.
- [ ] `hermes-3.png` — `Executar tarefa no Hermes` mostrando as etapas em andamento.
- [ ] `hermes-4.png` — `Execuções do Hermes` com uma aprovação pendente.
- [ ] `hermes-5.png` — `Ferramentas do Hermes`, com os rótulos de disponibilidade. Nesta
      instalação a distribuição real é 14 `Disponível`, 13 `Desligado` e 1 `Indisponível`;
      `Precisa configurar` não aparece ([D-15](DECISOES-VERIFICADAS.md)).
- [ ] `hermes-6.png` — `Modelos do Hermes`.

Cuidado que só aparece depois: **enquanto `metadata/` não existe, o `ray lint` pula a checagem
inteira**. No instante em que a pasta nasce, todo `.png` dentro dela passa pelo teste de
tamanho — inclusive um rascunho esquecido lá.

Antes de publicar, confira também que `author` no `package.json` é o **seu nome de usuário do
Raycast**. Ele foi trocado de `sam` para `savio22` em 2026-08-21 **sem verificação**; quem
confirma é `npx ray profile` depois do `npx ray login`. Se não bater com a conta, a publicação
é recusada.

Uma última: o `ray publish` monta o pacote com **um** readme. Existem dois na raiz, e ele
escolhe o `README.md` — a preferência por `readme.md` exato está em
`node_modules/@raycast/api/dist/commands/publish/index.js`. O `README.pt-BR.md` não vai junto.

E há um bloqueio conhecido da Store, que é decisão de nomenclatura e não defeito: o `ray lint` emite
**14 avisos de Title Case**, todos porque os títulos de comando são frases em português. Precisa ser
resolvido antes da submissão; está registrado no [ROADMAP.md](../ROADMAP.md).

---

## Como reportar

Para cada item que falhar, anote: o que você fez, o que apareceu, e o que esperava. Não é preciso
diagnosticar — a citação do que apareceu na tela basta.
