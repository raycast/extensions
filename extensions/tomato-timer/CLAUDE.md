# raycast-pomodoro (Tomato Timer)

extensão do Raycast para Windows, publicada na Store como **Tomato Timer** (`name: tomato-timer`, author `gabriel_s`, que é o username do biel no Raycast). um comando só, "Pomodoro": o biel ativa digitando "pomodoro". a UI é toda em inglês porque a Store só aceita US English.

## o que mede sucesso

- digitar "pomodoro" no Raycast abre a lista; escrever a tarefa e dar Enter começa um foco e fecha o Raycast.
- o timer flutuante aparece no canto e some sozinho quando a sessão acaba, para ou é trocada.
- o aviso de fim (toast do Windows mais som) chega com o Raycast fechado.
- todo foco concluído, ou parado depois de 1 minuto, entra no histórico e nos gráficos.

## como rodar

- `npm run dev` (ray develop) instala a extensão local e recompila a cada save. a cópia fica em `%USERPROFILE%\.config\raycast\extensions\tomato-timer`.
- `npm run lint` e `npm run build` precisam passar antes de publicar.
- `npm run publish` abre ou atualiza o PR no `raycast/extensions` (login do Raycast já feito com `npx ray login`).
- dados do usuário: `%LOCALAPPDATA%\Raycast\extensions\tomato-timer\` (`active.json`, `history.json`, `overlay.log`, `overlay.beat`, `overlay-position.json`).

## como funciona

- `src/pomodoro.tsx`: List com painel de detalhe. a busca vira o nome da tarefa (`filtering={false}`). relê `active.json` a cada segundo.
- `src/svg.ts`: timer grande, anel do dia, barras da semana, heatmap, hora do dia e linha do tempo do dia, tudo SVG em data URI no markdown do detalhe. tema claro e escuro por `environment.appearance`; acento único `#E5484D`.
- `src/storage.ts`: tipos, leitura e escrita atômica (tmp + rename), `reconcile` fecha sessão que acabou ou foi parada com a view fechada.
- `src/overlay.ts` + `assets/overlay.ps1`: janela WPF no Windows PowerShell, sempre no topo, com pausar, parar e esconder no hover; arrastável, lembra a posição. dispara o toast e o som no fim.

## armadilhas

- o Raycast mata processo filho quando o comando fecha: o overlay sobe por `cmd /c start`, que desgruda. spawn direto do powershell morre.
- só a view escreve `history.json`. o overlay escreve só `active.json` (paused, remainingMs, endAt, overlay, stoppedAt) e a view reconcilia.
- um overlay por vez: mutex `Local\TomatoTimerOverlay` no script, mais o heartbeat `overlay.beat` que a view reivindica antes de subir outro.
- o overlay só fecha depois de duas leituras seguidas sem a sessão, pra não fechar num arquivo pego no meio da troca.
- `overlay.ps1` precisa de BOM UTF-8 (PowerShell 5.1 lê ANSI sem BOM). editar por Write ou por script que preserve o BOM.
- todo `List.Item` tem `id` fixo: sem ele a seleção volta pro topo a cada segundo, porque o título do timer muda.
- texto com barra invertida escrito por heredoc no Bash desta máquina perde a barra; escrever pelo Write.
- os screenshots da Store (`metadata/`) foram montados com dados de demonstração; o histórico real foi zerado depois.
