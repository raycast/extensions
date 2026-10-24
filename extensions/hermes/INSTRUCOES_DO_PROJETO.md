# Hermes para Raycast — Instruções do Projeto

## Objetivo

Criar uma extensão do Raycast para Windows que ofereça acesso rápido, visual, seguro e fácil de usar ao Hermes Agent.

O usuário deve conseguir abrir o Raycast, pedir algo ao Hermes, acompanhar a execução e usar o resultado sem precisar abrir terminal, decorar comandos ou compreender detalhes internos da API.

### Estado atual da implementação (2026-08-20)

Os sete fluxos-base do MVP e os oito comandos antes previstos para a segunda fase já estão
implementados no checkout atual, totalizando 15 comandos no manifesto. A ordem das fases abaixo
continua sendo a prioridade de produto; não deve ser lida como ausência das telas já entregues.
A validação visual e contra um Hermes ligado continua sendo feita à mão.

## Resultado esperado

A extensão deve funcionar como uma interface compacta para o Hermes, não como uma cópia completa do Hermes Desktop.

O fluxo principal deve ser:

```text
Abrir Raycast → escolher uma ação → enviar ao Hermes → acompanhar → usar o resultado
```

O usuário deve conseguir obter valor em poucos segundos.

## Público e princípio de produto

O público inclui usuários que não são desenvolvedores e preferem interfaces visuais. Portanto:

- usar português brasileiro claro na interface inicial;
- evitar termos técnicos quando não forem necessários;
- oferecer defaults úteis;
- mostrar opções avançadas somente quando solicitadas;
- manter os fluxos curtos e previsíveis;
- permitir uso completo por teclado;
- sempre deixar claro se o Hermes está processando, aguardando aprovação, concluído ou com erro;
- nunca exigir terminal para o uso normal da extensão.

## Princípios obrigatórios de usabilidade

1. **Valor imediato:** o comando principal deve ser `Perguntar ao Hermes`.
2. **Poucos passos:** perguntas rápidas não devem exigir formulário complexo.
3. **Progressive disclosure:** modelo, provider, sessão e instruções avançadas ficam opcionais.
4. **Feedback contínuo:** usar loading, streaming, Toast, HUD e estados legíveis.
5. **Ações úteis no resultado:** copiar, colar, continuar, parar e abrir a conversa.
6. **Erros acionáveis:** explicar o problema e oferecer uma ação concreta para corrigi-lo.
7. **Segurança visível:** ações sensíveis ou destrutivas exigem confirmação.
8. **Sem surpresas:** fechar a janela do Raycast não deve ser tratado como cancelamento da tarefa.
9. **Consistência:** os mesmos nomes e estados devem aparecer em todos os comandos.
10. **Desempenho:** carregar primeiro os dados essenciais e buscar detalhes sob demanda.

## Arquitetura

A extensão é um cliente TypeScript/React para o Hermes API Server.

```text
Raycast Extension
        │
        │ HTTP + Server-Sent Events
        ▼
Hermes API Server
http://127.0.0.1:8642
        │
        ▼
Hermes Agent + modelo + tools + skills + memória + sessões
```

### Decisões arquiteturais

- usar o Hermes API Server como integração principal;
- usar HTTP para requisições comuns e SSE para streaming/eventos;
- não ler diretamente arquivos internos do Hermes;
- não usar o token do Nous Portal dentro da extensão;
- não usar o Subscription Proxy para o fluxo principal;
- não depender de PowerShell para a integração central;
- permitir PowerShell apenas como recurso auxiliar específico do Windows;
- fazer detecção de recursos por `GET /v1/capabilities`;
- manter a camada da API separada dos componentes de interface.

## Stack

- Raycast Extension API
- TypeScript com modo estrito
- React
- `@raycast/api`
- `@raycast/utils` quando realmente simplificar o código
- HTTP `fetch`
- Server-Sent Events para runs e chat em streaming
- LocalStorage e Cache do Raycast

## Configuração da conexão

Preferências da extensão:

- `apiUrl`: URL do Hermes, default `http://127.0.0.1:8642`;
- `apiServerKey`: chave local do API Server, tipo `password`;
- `sessionKey`: escopo estável de memória, default `raycast:windows:default`;
- `defaultProvider`: opcional;
- `defaultModel`: opcional;
- `streamResponses`: habilitado por padrão;
- `maxHistoryItems`: limite de itens carregados na interface.

Headers principais:

```http
Authorization: Bearer <API_SERVER_KEY>
Content-Type: application/json
X-Hermes-Session-Id: <conversation-or-session-id>
X-Hermes-Session-Key: raycast:windows:default
```

A chave do API Server deve ser armazenada como preferência protegida. Nunca registrar seu valor em logs, erros, screenshots, fixtures ou commits.

## Funcionalidades priorizadas

### MVP — obrigatório

#### 1. Perguntar ao Hermes

- aceitar uma pergunta curta diretamente pelo comando;
- permitir um editor de prompt quando necessário;
- enviar para o Hermes;
- mostrar resposta em Markdown;
- atualizar a resposta em streaming;
- oferecer ações para copiar, colar e continuar;
- lembrar a última sessão usada;
- permitir começar uma nova conversa.

#### 2. Verificar conexão

- consultar `/health`;
- consultar `/v1/capabilities`;
- informar se URL e chave estão corretas;
- mostrar ação `Abrir configurações` quando faltar configuração;
- não exibir mensagens técnicas sem uma explicação simples.

#### 3. Conversas

- listar sessões;
- pesquisar por título;
- abrir histórico;
- criar sessão;
- continuar sessão;
- renomear;
- fazer fork;
- excluir somente com confirmação.

#### 4. Executar tarefa

- criar run assíncrono;
- mostrar progresso e eventos;
- mostrar ferramenta atual quando disponível;
- mostrar resultado final;
- permitir parar;
- permitir orientar uma execução em andamento;
- resolver pedidos de aprovação.

#### 5. Modelos

- consultar `/api/model/options`;
- mostrar provider, modelo e capacidades;
- permitir definir modelo padrão;
- permitir override por tarefa sem alterar o default global.

### Segunda fase — já implementada no checkout atual

#### Contexto rápido

- `Perguntar sobre seleção`: usar o texto selecionado na aplicação atual;
- `Resumir clipboard`;
- `Corrigir clipboard`;
- `Traduzir clipboard`;
- `Colar resposta` na aplicação atual.

#### Skills e ferramentas

- listar `/v1/skills`;
- pesquisar skills por nome, categoria ou descrição;
- listar `/v1/toolsets`;
- mostrar quais toolsets estão habilitados e configurados;
- mostrar as tools concretas de cada toolset.

#### Automações

- listar jobs;
- criar e editar job;
- pausar e retomar;
- executar imediatamente;
- remover com confirmação;
- mostrar schedule, skills, provider e destino.

### Terceira fase

- anexos e imagens, após validar o formato multimodal da API;
- deeplinks para comandos da extensão;
- Tool para a IA do Raycast chamar capacidades controladas do Hermes;
- suporte opcional a Hermes remoto;
- suporte opcional a macOS sem prejudicar a experiência do Windows.

## Endpoints do Hermes

### Descoberta e diagnóstico

```text
GET /health
GET /health/detailed
GET /v1/capabilities
GET /v1/models
GET /api/model/options
GET /v1/skills
GET /v1/toolsets
```

### Chat

```text
POST /v1/chat/completions
POST /v1/responses
```

### Runs

```text
POST /v1/runs
GET  /v1/runs/{run_id}
GET  /v1/runs/{run_id}/events
POST /v1/runs/{run_id}/approval
POST /v1/runs/{run_id}/steer
POST /v1/runs/{run_id}/stop
```

### Sessões

```text
GET    /api/sessions
POST   /api/sessions
GET    /api/sessions/{id}
PATCH  /api/sessions/{id}
DELETE /api/sessions/{id}
GET    /api/sessions/{id}/messages
POST   /api/sessions/{id}/fork
POST   /api/sessions/{id}/chat
POST   /api/sessions/{id}/chat/stream
```

### Jobs

```text
GET    /api/jobs
POST   /api/jobs
GET    /api/jobs/{job_id}
PATCH  /api/jobs/{job_id}
DELETE /api/jobs/{job_id}
POST   /api/jobs/{job_id}/pause
POST   /api/jobs/{job_id}/resume
POST   /api/jobs/{job_id}/run
```

## Componentes Raycast recomendados

- `List`: sessões, runs, modelos, skills, toolsets e jobs;
- `Detail`: resposta em Markdown, streaming, relatório e logs;
- `Form`: configuração, criação de job e prompt avançado;
- `ActionPanel`: ações contextuais;
- `Action`: copiar, colar, abrir, continuar, parar e confirmar;
- `Toast`: progresso e erros que permitem retry;
- `HUD`: confirmação rápida após copiar ou iniciar uma ação;
- `Alert`: exclusões, cancelamentos e aprovações sensíveis;
- `Clipboard`: ler, copiar e colar conteúdo;
- `LocalStorage`: estado pequeno e não sensível;
- `Cache`: modelos, skills, capabilities e dados temporários.

## Comandos da extensão

Nomes dos comandos entregues:

```text
Perguntar ao Hermes
Conversas do Hermes
Executar tarefa no Hermes
Execuções do Hermes
Modelos do Hermes
Skills do Hermes
Ferramentas do Hermes
Automações do Hermes
Perguntar sobre seleção
Resumir clipboard
Corrigir texto do clipboard
Traduzir clipboard
Colar última resposta
Verificar conexão com Hermes
Configurar Hermes
```

O comando `Perguntar ao Hermes` deve ser o principal e aparecer primeiro.

## Fluxos de UX

### Primeiro uso

1. Abrir qualquer comando.
2. Detectar que URL ou chave estão ausentes.
3. Exibir uma tela simples explicando que é necessário conectar ao Hermes local.
4. Oferecer `Abrir configurações`.
5. Depois de salvar, executar teste de conexão uma vez.
6. Se funcionar, abrir diretamente o comando solicitado.

### Pergunta rápida

1. Receber texto pelo argumento ou Form.
2. Iniciar streaming.
3. Exibir resposta em `Detail`.
4. Durante a execução, mostrar `Parar`.
5. Após concluir, mostrar `Copiar`, `Colar`, `Continuar` e `Nova conversa`.

### Tarefa longa

1. Criar `/v1/runs`.
2. Abrir stream de eventos.
3. Mostrar estado atual em linguagem simples.
4. Exibir ferramentas sem despejar logs técnicos por padrão.
5. Pedir aprovação quando necessário.
6. Manter o `run_id` para reabrir o status.
7. Mostrar resultado final e ações úteis.

### Erro de conexão

Mensagem recomendada:

```text
Não foi possível conectar ao Hermes.
Verifique se o Hermes API Server está ativo e se a URL e a chave estão corretas.
```

Ações:

```text
Tentar novamente
Abrir configurações
Copiar detalhes técnicos
```

Os detalhes técnicos devem ficar ocultos por padrão.

## Estados padronizados

Usar estes rótulos em toda a interface:

```text
Preparando
Executando
Aguardando aprovação
Interrompendo
Concluído
Cancelado
Falhou
```

Não misturar vários nomes para o mesmo estado.

## Estrutura prevista

```text
assets/
  hermes.png
src/
  ask-hermes.tsx
  sessions.tsx
  session-detail.tsx
  run-task.tsx
  active-runs.tsx
  models.tsx
  skills.tsx
  toolsets.tsx
  jobs.tsx
  check-connection.tsx
  lib/
    hermes-api.ts
    hermes-events.ts
    errors.ts
    preferences.ts
    storage.ts
    types.ts
package.json
tsconfig.json
README.md
INSTRUCOES_DO_PROJETO.md
```

Não criar todos os arquivos antecipadamente. Criar apenas quando uma funcionalidade exigir, seguindo YAGNI.

## Organização do código

- `hermes-api.ts`: cliente HTTP, autenticação e parsing de respostas;
- `hermes-events.ts`: parsing de SSE e eventos de execução;
- `errors.ts`: erros tipados e tradução para mensagens amigáveis;
- `preferences.ts`: leitura centralizada das preferências;
- `storage.ts`: LocalStorage e Cache;
- `types.ts`: tipos compartilhados derivados das respostas oficiais;
- componentes de UI não devem conter lógica duplicada de requisição.

## Regras de engenharia

- TypeScript strict;
- não usar `any` sem justificativa documentada;
- cancelar streams quando o comando for desmontado;
- usar `AbortController` para cancelamento local;
- tratar timeout, desconexão, 401, 403, 404, 409, 429 e 5xx;
- não presumir que todos os endpoints existem: consultar capabilities;
- não duplicar o cliente HTTP em vários comandos;
- não bloquear a interface enquanto carrega dados secundários;
- usar paginação para listas grandes;
- armazenar somente o mínimo necessário;
- evitar dependências adicionais quando a API nativa resolver;
- separar mensagens de usuário dos detalhes técnicos;
- escrever testes para cliente HTTP, parsing de eventos e tratamento de erros;
- não declarar a tarefa concluída sem lint, build e teste manual mínimo.

## Segurança

- nunca imprimir ou expor `apiServerKey`;
- nunca acessar `auth.json` do Hermes;
- nunca colocar chaves em `package.json`, código, fixtures ou README;
- preferir `127.0.0.1` a uma interface de rede pública;
- confirmar exclusões e operações destrutivas;
- pedidos de aprovação do Hermes devem ser mostrados ao usuário, não aceitos automaticamente;
- a interface deve deixar claro quando o Hermes pode modificar arquivos ou executar comandos;
- não cachear transcripts completos por padrão;
- sanitizar mensagens técnicas antes de apresentá-las ao usuário.

## Windows

- declarar `"platforms": ["Windows"]` no MVP;
- não usar Menu Bar Commands, pois não estão disponíveis no Windows;
- não usar AppleScript;
- não depender de APIs do Finder;
- atalhos devem usar modificadores compatíveis com Windows;
- `runPowerShellScript` é permitido somente para funcionalidades auxiliares;
- manter a integração central independente do shell.

## Não objetivos do MVP

- replicar todo o Hermes Desktop;
- criar chat com dezenas de configurações visíveis ao mesmo tempo;
- editar config interna do Hermes;
- autenticar diretamente no Nous Portal;
- instalar ou configurar automaticamente providers;
- executar ações destrutivas sem aprovação;
- suportar todos os sistemas operacionais desde o primeiro release;
- construir um framework genérico antes de validar o comando principal.

## Critérios de aceite do MVP

- instalação local da extensão funciona no Raycast para Windows;
- usuário configura URL e chave sem editar código;
- teste de conexão oferece resultado claro;
- `Perguntar ao Hermes` retorna resposta real;
- resposta aparece progressivamente quando streaming estiver disponível;
- usuário consegue copiar e continuar a resposta;
- usuário consegue criar e abrir sessões;
- usuário consegue iniciar e interromper uma run;
- aprovação solicitada pelo Hermes aparece na interface;
- nenhum segredo aparece em logs ou no repositório;
- lint e build passam;
- uma pessoa sem conhecimento de terminal consegue usar o fluxo principal.

## Verificação

Comandos previstos:

```bash
npm install
npx ray lint
npx ray build
```

Durante desenvolvimento:

```bash
npx ray develop
```

Quando testes forem adicionados:

```bash
npm test
```

Checklist manual:

- [ ] primeiro uso sem configuração;
- [ ] conexão válida;
- [ ] chave inválida;
- [ ] Hermes desligado;
- [ ] pergunta curta;
- [ ] resposta em streaming;
- [ ] interrupção de run;
- [ ] pedido de aprovação;
- [ ] lista vazia;
- [ ] sessão com muitas mensagens;
- [ ] erro de rede durante streaming;
- [ ] cópia e colagem de resposta;
- [ ] navegação completa somente por teclado.

## Ordem de implementação

1. Scaffold oficial do Raycast.
2. Preferências e tela de primeiro uso.
3. Cliente HTTP e `/health`.
4. Capabilities e tratamento de erros.
5. `Perguntar ao Hermes` sem streaming.
6. Streaming e cancelamento.
7. Sessões e histórico.
8. Runs e eventos.
9. Stop, steer e approval.
10. Modelos.
11. Texto selecionado e clipboard.
12. Skills e toolsets.
13. Jobs e automações.
14. Polimento, testes e documentação.

## Fluxo de trabalho para desenvolvimento

Ao trabalhar neste projeto:

1. ler este arquivo antes de alterar o código;
2. consultar a documentação oficial antes de presumir um endpoint ou campo;
3. implementar apenas a próxima funcionalidade aprovada;
4. manter alterações pequenas e revisáveis;
5. executar lint e build após cada conjunto coerente de mudanças;
6. testar a integração com um Hermes API Server real;
7. não fabricar respostas ou resultados de testes;
8. registrar limitações conhecidas no README;
9. priorizar facilidade de uso sobre quantidade de opções;
10. não adicionar complexidade que não melhore uma jornada real do usuário.

## Documentação oficial

### Raycast

- Getting Started: https://developers.raycast.com/basics/getting-started
- Criar extensão: https://developers.raycast.com/basics/create-your-first-extension.md
- Índice completo: https://developers.raycast.com/llms.txt
- Manifesto: https://developers.raycast.com/information/manifest.md
- Estrutura de arquivos: https://developers.raycast.com/information/file-structure.md
- CLI: https://developers.raycast.com/information/developer-tools/cli.md
- Interface: https://developers.raycast.com/api-reference/user-interface.md
- Actions: https://developers.raycast.com/api-reference/user-interface/actions.md
- Clipboard: https://developers.raycast.com/api-reference/clipboard.md
- Environment: https://developers.raycast.com/api-reference/environment.md
- Preferences: https://developers.raycast.com/api-reference/preferences.md
- Storage: https://developers.raycast.com/api-reference/storage.md
- Cache: https://developers.raycast.com/api-reference/cache.md
- Background Refresh: https://developers.raycast.com/information/lifecycle/background-refresh.md
- Deeplinks: https://developers.raycast.com/information/lifecycle/deeplinks.md
- PowerShell: https://developers.raycast.com/utilities/functions/runpowershellscript.md
- Raycast Windows: https://www.raycast.com/windows

### Hermes

- Documentação: https://hermes-agent.nousresearch.com/docs/
- API Server: https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server
- Integração programática: https://hermes-agent.nousresearch.com/docs/developer-guide/programmatic-integration
- Subscription Proxy: https://hermes-agent.nousresearch.com/docs/user-guide/features/subscription-proxy

## Definição de pronto

Uma funcionalidade só está pronta quando:

- atende ao fluxo de usuário descrito;
- possui estado de loading, vazio, sucesso e erro;
- é utilizável somente pelo teclado;
- não expõe dados sensíveis;
- tem comportamento seguro em cancelamento e reconexão;
- passa lint e build;
- foi exercitada contra o Hermes real;
- não exige que o usuário conheça comandos de terminal para usá-la.
