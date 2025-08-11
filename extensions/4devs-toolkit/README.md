# 4Devs Toolkit for Raycast

Gerador de documentos brasileiros válidos para testes, diretamente no Raycast.

## ⚠️ Disclaimer / Aviso Legal

**This is an UNOFFICIAL extension, not affiliated with [4Devs](https://www.4devs.com.br/).**

Este projeto é uma homenagem ao excelente trabalho da equipe 4Devs, que desde 2012 vem ajudando milhares de desenvolvedores brasileiros com suas ferramentas gratuitas. Esta extensão traz algumas dessas funcionalidades para o Raycast, permitindo acesso rápido sem sair do seu fluxo de trabalho.

**Esta é uma extensão NÃO OFICIAL, sem afiliação com [4Devs](https://www.4devs.com.br/).**

Visite o site oficial em [www.4devs.com.br](https://www.4devs.com.br/) para acessar todas as ferramentas originais e completas.

## 🎯 Features / Funcionalidades

### Geradores de Documentos
- **CPF**: Gera CPFs válidos com opção de estado de origem
- **CNPJ**: Gera CNPJs válidos para empresas
- **CNH**: Gera números de CNH válidos
- **Certidão**: Gera matrículas de certidões (nascimento, casamento, óbito)
- **Cartão de Crédito**: Gera números válidos para testes (Visa, MasterCard, etc.)

### Recursos Adicionais
- 📋 **Histórico**: Mantém registro dos documentos gerados
- ⭐ **Favoritos**: Marque documentos frequentemente usados
- 🔄 **Geração em Lote**: Gere até 50 documentos de uma vez
- 📊 **Exportação**: Exporte em JSON, CSV ou texto simples
- 🎭 **Formatação**: Com ou sem máscara/pontuação

## 📸 Screenshots

![4Devs Toolkit Commands](metadata/4devs-toolkit-01.png)
![CPF Generator](metadata/4devs-toolkit-02.png)

## 🚀 Installation / Instalação

### Via Raycast Store (Recomendado)
1. Abra o Raycast
2. Procure por "4Devs Toolkit"
3. Clique em Install

### Manual
```bash
git clone https://github.com/thalysguimaraes/4devs-raycast.git
cd 4devs-raycast
npm install
npm run build
npm run publish
```

## 💻 Usage / Como Usar

### Gerar CPF
1. Abra Raycast (`⌘ Space`)
2. Digite "Gerar CPF"
3. Escolha o estado (opcional)
4. Pressione `⌘↵` para gerar

### Gerar em Lote
1. No campo "Quantidade", digite o número desejado (máx: 50)
2. O resultado será copiado em formato JSON/CSV/Texto

### Atalhos de Teclado
| Ação | Atalho |
|------|--------|
| Gerar | `⌘↵` |
| Copiar | `⌘C` |
| Colar | `⌘V` |
| Favoritar | `⌘F` |
| Deletar do Histórico | `⌘⌫` |

## 🛠 Development / Desenvolvimento

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build extension
npm run build

# Run linter
npm run lint
```

## 🤝 Contributing / Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o repositório
2. Crie sua feature branch (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Add: Nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

## 📝 Credits / Créditos

- **Inspiração**: [4Devs](https://www.4devs.com.br/) - O site original com todas as ferramentas
- **Plataforma**: [Raycast](https://raycast.com/) - Por tornar extensões como esta possíveis
- **Comunidade**: Todos os desenvolvedores brasileiros que usam e apoiam ferramentas open source

## 🙏 Acknowledgments / Agradecimentos

Um agradecimento especial à equipe 4Devs por criar e manter ferramentas tão úteis para a comunidade de desenvolvedores brasileiros por mais de uma década. Este projeto é um tributo ao trabalho incrível que vocês fazem.

Se você acha estas ferramentas úteis, visite [4Devs](https://www.4devs.com.br/) e considere apoiar o projeto original.

## 📜 License / Licença

MIT - Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Nota**: Os documentos gerados são válidos apenas para TESTES e DESENVOLVIMENTO. Não utilize para atividades ilegais ou fraudulentas.

Made with ❤️ for the Brazilian developer community