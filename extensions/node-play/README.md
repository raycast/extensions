# Node Play - Extensão Raycast

Uma extensão para o Raycast que facilita a execução de projetos Node.js.

## Funcionalidades

- **Configuração de Pastas Raiz**: Configure múltiplas pastas que contenham projetos Node.js
- **Indexação Automática**: Escaneia automaticamente todos os projetos e scripts disponíveis
- **Busca Inteligente**: Pesquise por nome do projeto ou script
- **Execução Rápida**: Execute scripts diretamente do Raycast
- **Integração com Terminal**: Abre o terminal no diretório do projeto

## Instalação

### Método 1: Script Automático

```bash
git clone <este-repositorio>
cd node-play-raycast-extension
./install.sh
```

### Método 2: Manual

1. Clone este repositório
2. Navegue até o diretório da extensão
3. Execute `npm install` para instalar as dependências
4. Execute `npm run build` para compilar a extensão
5. No Raycast, vá em Extensions > Import Extension e selecione esta pasta

### Testando a Extensão

1. Após a instalação, adicione a pasta `example-project` como uma pasta raiz
2. Use "Node Play" no Raycast para ver o projeto de exemplo
3. Execute qualquer script do exemplo para testar a funcionalidade

## Uso

### Configuração Inicial

1. Abra o Raycast e digite "Configure Node Play"
2. Clique em "Adicionar Nova Pasta"
3. Selecione as pastas raiz que contêm seus projetos Node.js
4. A extensão irá automaticamente indexar todos os projetos

### Executando Scripts

1. Abra o Raycast e digite "Node Play"
2. Digite o nome do projeto ou script que deseja executar
3. Selecione o script desejado da lista
4. O script será executado no terminal

### Formato da Lista

Os scripts são exibidos no formato:

```
nome-do-script | nome-do-projeto
```

## Estrutura do Projeto

```
src/
├── types.ts          # Definições de tipos TypeScript
├── config.ts         # Gerenciamento de configurações
├── projectScanner.ts # Escaneamento e indexação de projetos
├── index.tsx         # Comando principal de busca e execução
└── configure.tsx     # Comando de configuração
```

## Desenvolvimento

Para desenvolver a extensão:

```bash
npm install
npm run build
npm run dev
```

## Requisitos

- Node.js 18+
- Raycast
- macOS (para integração com Terminal e Finder)

## Licença

MIT
