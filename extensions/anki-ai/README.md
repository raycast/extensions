# Anki AI - Raycast Extension

![Anki AI Logo](./icon.png)

## Introdução

Anki AI é uma extensão para o Raycast que permite criar flashcards para o Anki utilizando inteligência artificial. Esta ferramenta integra o poder do Anki, um dos mais populares softwares de repetição espaçada para memorização, com a interface rápida e eficiente do Raycast.

Transforme textos em cartões de estudo personalizados de forma rápida e eficiente, aproveitando o poder da IA para gerar perguntas e respostas relevantes. Ideal para estudantes, profissionais e qualquer pessoa interessada em otimizar seu processo de aprendizagem através de flashcards.
## Pré-requisitos

Para utilizar a extensão Anki AI, você precisará:

- [Anki](https://apps.ankiweb.net/) instalado no seu computador
- [AnkiConnect](https://ankiweb.net/shared/info/2055492159) plugin instalado no Anki
- Anki deve estar aberto enquanto você usa a extensão

### Configuração do AnkiConnect

1. Abra o Anki
2. Vá para Ferramentas > Add-ons > Obter Add-ons
3. Cole o código `2055492159` e clique em OK
4. Reinicie o Anki após a instalação
5. Verifique se o AnkiConnect está funcionando corretamente acessando `http://localhost:8765` no seu navegador (deve mostrar uma mensagem relacionada ao AnkiConnect)
## Descrição Detalhada das Funcionalidades

A extensão Anki AI oferece diversas funcionalidades para tornar seu processo de criação de flashcards mais eficiente:

### Geração de Flashcards com IA
- Transforme qualquer texto em flashcards de alta qualidade usando inteligência artificial
- Algoritmos avançados identificam conceitos importantes e criam perguntas relevantes
- Personalize a quantidade de flashcards gerados para cada texto

### Suporte a Múltiplos Idiomas
- Compatível com Português, Inglês e Espanhol
- Interface adaptada aos diferentes idiomas
- Geração de conteúdo respeitando particularidades linguísticas

### Personalização e Configuração
- Configure decks e modelos específicos do Anki
- Personalize prompts para a IA conforme suas necessidades de estudo
- Controle sobre o formato e estilo dos flashcards gerados

### Recursos Adicionais
- Geração automática de tags para melhor organização
- Visualização prévia e edição de flashcards antes da exportação
- Melhoria de flashcards existentes com sugestões da IA
- Integração perfeita com o fluxo de trabalho do Raycast
## Instruções de Instalação Passo a Passo

Siga estas etapas para instalar e configurar a extensão Anki AI:

1. Instale o Raycast a partir do [site oficial](https://raycast.com/)
2. Instale o Anki a partir do [site oficial](https://apps.ankiweb.net/)
3. Abra o Anki e instale o plugin AnkiConnect:
   - No Anki, vá para Ferramentas > Add-ons > Obter Add-ons
   - Cole o código `2055492159` e clique em OK
   - Reinicie o Anki
4. Instale a extensão Anki AI no Raycast Store:
   - Abra o Raycast
   - Pressione `⌘` + `,` para abrir as preferências
   - Navegue até a aba "Extensions"
   - Clique em "Store"
   - Pesquise por "Anki AI" e instale

### Configuração Inicial

Após a instalação, configure a extensão:
1. Abra o Raycast e digite "Anki AI Settings"
2. Configure suas preferências básicas (idioma, modelo de IA, deck padrão)
3. Verifique a conexão com o Anki usando a opção "Testar Conexão"
## Opções de Configuração

A extensão Anki AI oferece um conjunto abrangente de opções de configuração para atender às suas necessidades específicas.

### Configurações Básicas

- **Idioma Padrão**: Escolha entre Português, Inglês ou Espanhol para geração de flashcards. Esta configuração afeta tanto a interface quanto o idioma dos flashcards gerados.

- **Modelo de IA**: Selecione o modelo de IA para geração de flashcards. Modelos mais avançados geralmente produzem flashcards de maior qualidade, mas podem ser mais lentos.

- **Deck Padrão**: Nome do deck padrão no Anki para exportação. Você pode especificar qualquer deck existente ou a extensão criará um novo deck se o especificado não existir.

- **Porta AnkiConnect**: Porta para conexão com o AnkiConnect (padrão: 8765). Altere apenas se você modificou a porta padrão do AnkiConnect.

### Configurações Avançadas

- **Mínimo de Flashcards**: Número mínimo de flashcards a serem gerados por texto (valor recomendado: 3-5). Define o limite inferior para a geração automática.

- **Máximo de Flashcards**: Número máximo de flashcards a serem gerados por texto (valor recomendado: 10-20). Define o limite superior para evitar gerar flashcards em excesso.

- **Ativar Tags**: Quando ativado, a IA gerará tags automaticamente para os flashcards baseadas no conteúdo do texto. Isso facilita a organização e recuperação dos cartões no Anki.

- **Template de Prompt Personalizado**: Personalize o prompt enviado para a IA, permitindo ajustar o tipo e estilo de flashcards gerados. Exemplo:
  ```
  Gere [NÚMERO] flashcards no formato pergunta/resposta sobre o seguinte texto, focando nos conceitos principais:
  [TEXTO]
  ```

- **Modo de Depuração**: Ativa logs detalhados para solução de problemas. Útil quando você está enfrentando problemas com a extensão.
## Screenshots e Guias Visuais

_Note: As imagens serão adicionadas em uma atualização futura_

### Tela Principal
Aqui será exibida a interface principal da extensão, mostrando o campo para inserção de texto e botões de ação.

### Processo de Geração
Esta captura mostrará o processo de geração de flashcards em andamento.

### Revisão de Flashcards
Imagem da tela de revisão e edição dos flashcards antes da exportação para o Anki.

### Configurações
Captura da tela de configurações da extensão.

## Seção de Uso

### Fluxo de Trabalho Básico

1. Abra o Anki no seu computador
2. Abra o Raycast e digite "Gerar Flashcards"
3. Cole o texto que deseja transformar em flashcards
4. Clique em "Gerar Flashcards"
5. Revise os flashcards gerados
6. Selecione os flashcards que deseja exportar
7. Clique em "Exportar para o Anki"

### Comandos Disponíveis

- `Gerar Flashcards`: Abre a interface principal para geração de flashcards
- `Configurações Anki AI`: Acessa as configurações da extensão
- `Melhorar Flashcard`: Permite melhorar um flashcard existente usando IA
- `Histórico de Flashcards`: Visualiza flashcards gerados anteriormente

### Exemplos de Uso

**Estudo de Artigos Científicos**
1. Copie um abstract ou seção importante
2. Gere flashcards focados em metodologia e resultados
3. Exporte para um deck específico para revisão espaçada

**Aprendizado de Idiomas**
1. Cole um texto no idioma que está aprendendo
2. Configure o template para focar em vocabulário ou gramática
3. Revise e exporte para seu deck de idiomas

**Revisão para Provas**
1. Insira suas anotações de aula
2. Ajuste o máximo de flashcards para um número maior
3. Organize com tags específicas por assunto
## Seção de Solução de Problemas

### Problemas Comuns e Soluções

- **Erro de conexão com o Anki**: 
  - Verifique se o Anki está aberto e o plugin AnkiConnect está instalado
  - Confirme que a porta configurada (padrão: 8765) corresponde à do AnkiConnect
  - Tente reiniciar tanto o Anki quanto o Raycast
  - Verifique se há firewalls bloqueando a conexão local

- **Nenhum flashcard gerado**: 
  - Tente com um texto mais longo ou mais específico
  - Verifique se o modelo de IA selecionado está disponível
  - Aumente o valor mínimo de flashcards nas configurações
  - Experimente textos com conteúdo mais estruturado ou educacional

- **Flashcards de baixa qualidade**: 
  - Experimente ajustar o template de prompt personalizado
  - Utilize um modelo de IA mais avançado
  - Forneça textos com conceitos mais claros e definidos
  - Edite manualmente os flashcards antes de exportar

- **Lentidão na geração**:
  - Textos muito longos podem demorar mais para processar
  - Reduza o número máximo de flashcards nas configurações
  - Verifique sua conexão com a internet
  - Tente um modelo de IA mais rápido (embora possivelmente menos avançado)

### Logs e Diagnóstico

Se você continuar enfrentando problemas:
1. Ative o Modo de Depuração nas configurações
2. Reproduza o problema
3. Acesse os logs em: `~/Library/Logs/Raycast/Extensions/anki-ai.log`
4. Entre em contato com o suporte fornecendo esses logs
## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## Licença

MIT
