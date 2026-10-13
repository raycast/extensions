# Azure Speech TTS+

Lê o texto selecionado em voz alta, com as vozes neurais da **Azure** ou com as vozes que já vêm no **Windows**, e mostra um painel flutuante que acende a palavra exata que está sendo falada.

- **Uma tecla começa e para.** O mesmo atalho de "Speak Selected Text" interrompe a leitura em andamento.
- **Clique numa palavra e ele volta pra lá.** A leitura recomeça daquele ponto. Se o áudio já cobre a palavra, o salto é instantâneo; se ela ficou para trás, o trecho é gerado de novo em ~2 s.
- **A velocidade está no painel.** Uma régua de chips — `0.8x` a `2.5x`, mais `-` e `+` de 0,1x — dentro da própria janela de leitura. Sem perder o lugar, sem mudar o timbre da voz e **sem abrir o Raycast**.
- **O painel muda de forma com o texto.** Frase curta abre uma faixa compacta embaixo; texto longo abre um painel largo no centro da tela, com passagem suficiente para clicar dentro.
- **Sem chave da Azure também funciona.** As vozes do Windows são offline e não custam nada.

## Comandos

| Comando | O que faz |
| --- | --- |
| **Speak Selected Text** | Lê a seleção. Rodar de novo durante a leitura é o "parar". |
| **Speed Up** / **Slow Down** | Ajusta 0,1x e continua da palavra atual. |
| **Pause or Resume** | Pausa e retoma exatamente onde parou. |
| **Stop Speaking** | Encerra e fecha o painel. |
| **Type to Speak** | Digita uma frase e ouve na hora, sem selecionar nada. |
| **Configure Speech** | Motor, voz, velocidade inicial e o painel — com "ouvir uma amostra". |

## O painel

É a interface inteira enquanto a leitura acontece.

| Onde | O que faz |
| --- | --- |
| **Qualquer palavra do texto** | Clique e a leitura recomeça dali. O cursor vira mãozinha e a palavra sob ele acende. |
| **Chips de velocidade** | `0.8x  1.0x  1.2x  1.5x  1.8x  2.0x  2.5x`. O escolhido fica aceso em azul. |
| **`-` e `+`** | Passo de 0,1x, para chegar a qualquer valor entre 0,5x e 2,5x. Fora da régua, o valor exato aparece à direita. |
| **Fora do texto** | Arrastar move o painel. Depois de movido à mão, ele para de se reposicionar sozinho. |

## Instalação

1. **Chave da Azure (opcional).** Nas preferências da extensão, preencha `Azure Speech Key` e `Service Region` (ex.: `brazilsouth`). Sem chave, o motor cai para Windows automaticamente.
2. **Atalho global.** No Raycast, ligue uma tecla em *Speak Selected Text*. É a única que você precisa decorar — o resto vive no painel.

Não há mais nada para instalar. A versão anterior registrava uma Tarefa Agendada de AutoHotkey para os atalhos `Shift + >` / `Shift + <`; eles foram desligados e as duas teclas voltaram a digitar `>` e `<` em qualquer lugar.

## Como funciona por dentro

Três processos, uma pasta de estado: `%LOCALAPPDATA%\azure-tts-plus`.

| Peça | Papel |
| --- | --- |
| **Comando do Raycast** (Node) | Sintetiza o áudio, escreve `job.json` e some. Vive poucos segundos. |
| **`assets\reader.ps1`** (WPF) | O leitor. Toca o wav, desenha o painel, escuta os cliques, escreve `status.json` a cada 150 ms. Sobrevive entre comandos e se encerra sozinho após 45 s parado. |
| **`assets\worker.mjs`** (Node) | Atende `request.json` — os pedidos do painel que exigem áudio novo. Sobe junto com a leitura e sai após 2 min parado. |

Cinco decisões que não são óbvias:

**A velocidade re-sintetiza, não acelera o áudio.** Esticar o wav mudaria o tom da voz. Ao trocar de velocidade, o texto restante é gerado de novo a partir da palavra corrente — o timbre fica onde a voz o pôs.

**Clicar numa palavra tem dois caminhos, e o barato é o normal.** Se a palavra está dentro do áudio que já existe, o leitor só move a agulha do wav: instantâneo, sem rede, sem custo. Só quando a palavra ficou *atrás* do início do áudio corrente é que um pedido vai para o worker — porque aquele trecho não existe em lugar nenhum.

**O painel não fala com o Raycast.** Medido nesta máquina: todo link `raycast://` traz a janela do Raycast para a frente — 3,0 s e um roubo de foco por toque, e ainda um piscar com `launchType=background`. Por isso o painel escreve `request.json` e quem responde é o worker, sem nada aparecer na tela. Os comandos *Speed Up* e *Slow Down* continuam existindo na paleta como porta alternativa.

**Processo destacado não pode herdar os canos do pai.** `cmd /c start` dá console próprio ao leitor, mas com `stdio` em pipe o neto segura o cano do Node e a promessa só resolve quando o leitor morre — 8,3 s medidos para um filho de 8 s, mais de um minuto para o leitor. O `stdio: "ignore"` é o que faz o worker subir *durante* a leitura, e não depois dela.

**A chave da Azure só existe em memória.** Ela sai das preferências criptografadas do Raycast direto para o bloco de ambiente do worker — nunca um arquivo, nunca uma linha de comando. Se a chave mudar, a impressão digital no `worker.json` deixa de bater e o worker antigo é encerrado.

**O leitor nasce por `cmd /c start`.** `detached: true` não dá console e o PowerShell nem inicia; um `spawn` comum divide o console do comando do Raycast e morre no meio da frase. O `start` dá um console próprio, que o leitor esconde na primeira linha.

**O mapa de palavras viaja como três vetores de números.** `ConvertFrom-Json` do PowerShell 5.1 leva cerca de um segundo em alguns milhares de objetos e alguns milissegundos nos mesmos dados como listas planas.

## Desenvolvimento

`npm run build` roda o `esbuild.mjs` **antes** do `ray build`: o worker não é um comando do Raycast, então ele só chega em `assets/worker.mjs` por esse passo. Editar `src/` e esquecer o worker deixa os chips do painel rodando código velho.

Quando algo falha, o motivo fica em disco, não só num HUD que some: `extension.log` (comandos), `worker.log` (pedidos do painel) e `reader.log` (áudio, painel e cliques), todos em `%LOCALAPPDATA%\azure-tts-plus`.

`docs/bateria.py` roda 26 testes contra o sistema no ar.

## Limites conhecidos

- **Windows apenas.** O leitor é WPF e o motor offline é o SAPI.
- **Texto muito longo** é cortado em pedaços de ~3000 caracteres antes de ir para a Azure, e os wavs são colados de volta. O tempo até a primeira palavra cresce com o tamanho.
- **`ray lint` reprova o campo `author`.** Ele consulta `raycast.com/api/v1/users/<nome>` de verdade. `ray build` e `ray develop` não checam — a extensão funciona.
