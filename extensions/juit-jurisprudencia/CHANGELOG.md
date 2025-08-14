# Changelog

## [1.0.0] - 2025-01-XX

### Added
- Busca de jurisprudência na base da JUIT com 68 milhões de precedentes
- Suporte a todos os 92 tribunais brasileiros
- Interface de busca avançada com operadores lógicos (E, OU, MASNAO)
- Filtros por tribunal, magistrado, instância e datas
- Busca em múltiplos campos (título, ementa, inteiro teor)
- Ordenação por relevância ou data
- Visualização detalhada dos resultados
- Integração com sistema RIMOR para acesso aos documentos completos
- Paginação para navegação em grandes volumes de resultados
- Copia de dados (título, ementa, URL, dados completos)
- Autenticação configurável via preferências do Raycast
- Validação de credenciais
- Tratamento de erros da API
- Interface responsiva e intuitiva

### Features
- **Operadores de Busca**: E, OU, MASNAO, aspas para busca exata, parênteses para agrupamento
- **Filtros Avançados**: 
  - 92 tribunais brasileiros (STF, STJ, TJs, TRFs, TRTs, etc.)
  - Magistrados/Relatores específicos
  - Instâncias (1ª, 2ª, Superior, Administrativo)
  - Tipos de documento (Acórdão, Decisão, Sentença, etc.)
  - Tipos de justiça (Comum, Especial)
- **Múltiplos Campos de Busca**: Título, Ementa, Inteiro Teor
- **Ordenação Inteligente**: Relevância, Data (mais recente/antiga)
- **Navegação**: Paginação automática, carregamento incremental
- **Integração**: Abertura direta no RIMOR, cópia de dados

### Technical Details
- Desenvolvido em TypeScript para o Raycast
- Cliente API robusto com tratamento de erros
- Interface responsiva usando @raycast/api
- Validação de entrada e sanitização de dados
- Suporte a todas as funcionalidades da API JUIT v1