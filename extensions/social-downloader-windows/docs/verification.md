# Verificação — 2026-10-31

Implementação Windows aprovada no chat e executada nesta pasta, inicialmente vazia e sem repositório Git. Não houve publicação nem alterações em repositórios remotos.

## Decisões de implementação

- MP4/MKV preservam os codecs de origem para evitar recodificação lenta. A interface explica a compatibilidade e sugere MKV quando necessário.
- MP3/M4A usam o bitrate escolhido quando há conversão; a interface explica que faixas já no formato solicitado podem ser preservadas pelo yt-dlp.
- Execução por argumentos, sem shell. Fechar o comando cancela o trabalho; cancelamento termina a árvore de processos no Windows.
- A preparação automática verifica yt-dlp, FFmpeg e FFprobe, necessários para download e pós-processamento.
- Node é habilitado explicitamente como runtime JavaScript do yt-dlp para YouTube.

## Evidência

- Testes locais cobrem validação de links, resolução/faixas, formatos sem metadados de codec, argumentos, saída de progresso, erros, timeout e cancelamento.
- Regressões de seleção de áudio combinado e codecs desconhecidos reproduzidas com testes falhando e corrigidas.
- Download real do vídeo público YouTube `jNQXAC9IVRw` com yt-dlp oficial 2026.10.26: MP4, MKV, MP3 e M4A concluídos. FFprobe confirmou vídeo H.264 + áudio AAC nos dois contêineres de vídeo; MP3 e AAC nos arquivos de áudio.
- Executável usado no teste em `.tools/yt-dlp.exe`; arquivos de teste em `.tools/smoke/`. Ambos ficam fora do código versionável.
- Interface nativa não verificada visualmente: a tentativa de abrir o Raycast não expôs uma janela controlável. A compilação e o modo de desenvolvimento do SDK concluíram com sucesso.
- Instagram e X não foram testados com links reais.
- `npm audit fix` não removeu 22 alertas moderados herdados das ferramentas Raycast/ESLint e suas dependências de minimatch. Nenhum downgrade incompatível ou override de versão principal foi aplicado.

## Preparação automática

- Removidas as preferências de executáveis: somente a pasta de destino permanece.
- Download automático de versões fixadas com verificação SHA-256, extração seletiva pelo tar nativo do Windows e teste dos três executáveis antes de concluir a instalação.
- Instalação limpa real concluída em `.tools/automatic-setup`, sem aproveitar os executáveis no PATH. As versões portáteis de yt-dlp, FFmpeg e FFprobe iniciaram corretamente.
- Segunda inicialização concluída com a função de rede desabilitada, comprovando reutilização sem novo download. Download real do YouTube para MP3 também concluído usando exclusivamente os componentes preparados automaticamente.
- Testes automatizados verificam download íntegro, rejeição/limpeza de arquivo corrompido, cancelamento e preservação de arquivos existentes. Total: 12 testes aprovados; tipos, lint e compilação aprovados.

## Carregamento no Raycast

- Erro real nos logs: `extensionHost.loadCommand` retornava `Missing executable` após importar o código.
- Causa: `npm run build` usava `-o dist`, mas o Raycast procurava o comando compilado na pasta padrão de extensões; essa pasta só tinha configurações e assets.
- Correção: restaurado o destino padrão do SDK em `npm run build`. Confirmada a presença de `download.js` (16.337 bytes) na pasta padrão; o Raycast registrou a atualização da extensão nos logs.
- Novo `npm run bundle` gera `dist/social-downloader-windows.rayext`, instalável sem importar código-fonte. Compilação e empacotamento concluídos com sucesso. Interface ainda depende de reabertura pelo usuário para verificação visual.

## Lotes, playlists e conversão

- 17 testes aprovados, incluindo prévia/deduplicação de playlists, expansão de plataformas, seleção de qualidade por vídeo, limite de concorrência, isolamento de falhas e cancelamento de fila.
- Conversões locais reais para MP4, MKV, MP3 e M4A concluídas usando os componentes portáteis da extensão.
- Prévia real do YouTube: playlist de um item e playlist de 95 itens; vídeo individual também retornou corretamente.
- Dois downloads reais simultâneos do YouTube, cada um seguido de conversão H.264/AAC para MP4, concluídos. Nomes únicos impediram colisão mesmo usando dois links do mesmo vídeo.
- `ray lint` validou manifesto, ícone, ESLint e Prettier. Tipos, compilação padrão e pacote instalável aprovados.
- Autor confirmado pelo usuário: `victorhugoguimaraes`. Autenticação do CLI Raycast concluída nessa conta.
- Interface pública convertida para inglês conforme as diretrizes de localização da Store. As plataformas adicionais têm suporte pelo extrator yt-dlp, mas ainda não foram verificadas com links reais nesta sessão.
