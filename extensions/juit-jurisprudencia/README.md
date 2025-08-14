# JUIT Jurisprudência - Extensão Raycast

Esta extensão permite pesquisar jurisprudência na base de dados da JUIT diretamente através do Raycast, acessando 68 milhões de precedentes de todos os 92 tribunais brasileiros.

## 🚀 Funcionalidades

- **Busca Avançada**: Pesquise por termos com operadores lógicos (E, OU, MASNAO)
- **Filtros Especializados**: Filtre por tribunal, magistrado, instância e muito mais
- **Múltiplos Campos**: Busque no título, ementa ou inteiro teor dos documentos
- **Ordenação Inteligente**: Ordene por relevância, data mais recente ou mais antiga
- **Visualização Detalhada**: Veja todos os detalhes da jurisprudência encontrada
- **Integração RIMOR**: Acesse diretamente o documento completo no sistema RIMOR

## 📋 Pré-requisitos

Para usar esta extensão, você precisa:

1. **Credenciais da API JUIT**: Usuário e senha para acessar a API
2. **Email cadastrado**: Seu email deve estar cadastrado no sistema JUIT
3. **Raycast instalado**: Versão mais recente do Raycast

## ⚙️ Configuração

1. **Instale a extensão** no Raycast
2. **Configure suas credenciais** nas preferências da extensão:
   - **Usuário da API**: Seu nome de usuário para a API da JUIT
   - **Senha da API**: Sua senha para a API da JUIT  
   - **Email do Proprietário**: Seu email cadastrado no sistema JUIT

## 🔍 Como Usar

### Comando Principal: "Buscar Jurisprudência"

1. **Abra o Raycast** (⌘ + Espaço)
2. **Digite**: "Buscar Jurisprudência" ou "JUIT"
3. **Preencha o formulário de busca:**
   - **Termo de Busca**: Digite sua consulta (ex: "indenização E 'danos morais'")
   - **Busca Exata**: Marque para buscar o termo exato
   - **Campos de Busca**: Escolha onde buscar (Título, Ementa, Inteiro Teor)
   - **Ordenação**: Relevância, Mais Recentes ou Mais Antigos
   - **Tribunais**: Filtre por tribunais específicos (opcional)
   - **Magistrado**: Filtre por relator específico (opcional)

### Operadores de Busca

A API da JUIT suporta operadores lógicos especiais:

- **E**: Todas as palavras devem estar presentes
  - Exemplo: `indenização E danos E morais`
- **OU**: Pelo menos uma palavra deve estar presente
  - Exemplo: `juros OU multa`
- **MASNAO**: Exclui termos dos resultados
  - Exemplo: `vítima MASNAO fatal`
- **Aspas ""**: Busca por termo exato
  - Exemplo: `"dano moral"`
- **Parênteses ()**: Agrupa termos para buscas complexas
  - Exemplo: `dano E (moral OU material)`

### Navegação nos Resultados

- **Ver Detalhes**: Visualize informações completas da jurisprudência
- **Abrir no RIMOR**: Acesse o documento completo no sistema oficial
- **Copiar Dados**: Copie título, ementa, URL ou dados completos
- **Carregar Mais**: Navegue por múltiplas páginas de resultados

## 🏛️ Tribunais Suportados

A extensão suporta todos os 92 tribunais brasileiros, incluindo:

### Tribunais Superiores
- STF - Supremo Tribunal Federal
- STJ - Superior Tribunal de Justiça  
- STM - Superior Tribunal Militar
- TSE - Tribunal Superior Eleitoral
- TST - Tribunal Superior do Trabalho

### Tribunais Estaduais (TJs)
- Todos os 27 Tribunais de Justiça Estaduais (TJSP, TJRJ, TJMG, etc.)

### Tribunais Federais (TRFs)
- TRF1 a TRF6 - Tribunais Regionais Federais

### Tribunais do Trabalho (TRTs)
- TRT1 a TRT24 - Tribunais Regionais do Trabalho

### Tribunais Eleitorais (TREs)
- Todos os Tribunais Regionais Eleitorais

### Tribunais Militares (TJMs)
- TJMMG, TJMRS, TJMSP

### Órgãos Administrativos
- CARF, TCU, TCE-SP, RFB, TIT-SP

## 📊 Filtros Avançados

### Por Instância
- 1ª Instância
- 2ª Instância  
- Tribunal Superior
- Administrativo

### Por Tipo de Documento
- Acórdão
- Decisão Monocrática
- Sentença
- Decisão
- Despacho
- Admissibilidade

### Por Tipo de Justiça
- Juízo Comum
- Juizado Especial

## 🛠️ Desenvolvimento

### Estrutura do Projeto

```
src/
├── api.ts              # Cliente da API JUIT
├── constants.ts        # Constantes (tribunais, tipos, etc.)
├── types.ts            # Definições de tipos TypeScript
├── utils.ts            # Funções utilitárias
└── search-jurisprudence.tsx  # Componente principal
```

### Scripts Disponíveis

- `npm run dev` - Executar em modo desenvolvimento
- `npm run build` - Build para produção
- `npm run lint` - Verificar código
- `npm run fix-lint` - Corrigir problemas de lint

## 🔒 Segurança

- As credenciais são armazenadas de forma segura nas preferências do Raycast
- Todas as comunicações usam HTTPS
- A extensão não armazena dados sensíveis localmente

## 📞 Suporte

Para suporte técnico ou dúvidas sobre a API JUIT, entre em contato com:
- **JUIT**: https://juit.io
- **Documentação da API**: Consulte os arquivos incluídos na extensão

## 📄 Licença

MIT License - Veja o arquivo LICENSE para detalhes.

---

**Desenvolvido para profissionais que buscam excelência na pesquisa jurídica**

*Jurisprudência e Jurimetria impulsionadas por IA, para permitir que você faça menos trabalho manual e obtenha melhores resultados.*