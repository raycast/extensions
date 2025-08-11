# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [0.0.1] - 2025-08-11

### 🎉 Lançamento Inicial

#### Adicionado
- **Geradores de Documentos**:
  - CPF com suporte a estado de origem
  - CNPJ com formatação empresarial
  - CNH (Carteira Nacional de Habilitação)
  - Certidões (Nascimento, Casamento, Óbito)
  - Cartões de Crédito para testes (Visa, MasterCard, AmEx, etc.)

- **Funcionalidades**:
  - 📋 Sistema de histórico local
  - ⭐ Favoritos para acesso rápido
  - 🔄 Geração em lote (até 50 itens)
  - 📊 Exportação em JSON, CSV e texto
  - 🎭 Opção de formatação com/sem máscara
  - 🇧🇷 Interface completamente em português

- **Experiência do Usuário**:
  - Atalhos de teclado intuitivos
  - Toast notifications para feedback
  - Ação padrão configurável (copiar/colar)
  - Validação local de todos os documentos
  - Icons personalizados para cada tipo de documento

#### Detalhes Técnicos
- Algoritmos de geração 100% offline
- Sem dependências externas ou APIs
- Validação usando módulo 11 e algoritmo de Luhn
- Armazenamento local com Raycast LocalStorage

#### Agradecimentos
- Inspirado pelo trabalho incrível da equipe [4Devs](https://www.4devs.com.br/)
- Uma homenagem a mais de uma década de ferramentas gratuitas para desenvolvedores

---

**Nota**: Esta é uma extensão não oficial, criada como tributo ao 4Devs.