# Praticar Português

Treino de digitação em português no espírito do AgileFingers, só que o texto que você digita
ensina vocabulário: cada palavra vem com **três etapas** — a palavra, o significado dela e
uma frase usando a palavra. Você aprende digitando e lendo ao mesmo tempo.

**A digitação é bloqueada no erro.** Tecla errada não entra no campo: ela é recusada,
contada, e o cursor não anda. Você só avança escrevendo certo — por isso tudo o que está à
esquerda do cursor está correto por construção, e nunca aparece texto errado na tela.

283 verbetes embarcados. Nenhuma chamada de rede, nenhuma chave de API, nenhum custo.
Funciona sem internet.

## Os três comandos

| Comando                | O que faz                                                                      |
| ---------------------- | ------------------------------------------------------------------------------ |
| **Praticar Digitação** | A sessão de três etapas por palavra.                                           |
| **Vocabulário**        | Busca em todo o léxico por palavra, classe ou significado, com o seu histórico. |
| **Meu Progresso**      | Velocidade, precisão, sequência de dias e as palavras que mais escapam de você. |

## Como a sessão funciona

O texto a digitar aparece **grande, em uma linha só**, com um cursor `▍` separando o que já
passou do que falta. Abaixo, uma barra de progresso enche caractere a caractere:

```
###### PALAVRA 4 DE 10  ·  ETAPA 1 DE 3  ·  A PALAVRA

# efê▍mero

`███████████░░░░░░░░░░░░░░░`  3 / 7
```

O contexto é revelado aos poucos, uma etapa de cada vez:

| Etapa | Você digita        | O que já está na tela               |
| ----- | ------------------ | ----------------------------------- |
| 1     | a palavra          | só a palavra                        |
| 2     | o significado      | a palavra e a classe gramatical     |
| 3     | a frase de exemplo | a palavra, a classe e o significado |

Mostrar tudo de uma vez tira a razão de digitar. Cada etapa vencida vira o contexto da
seguinte — quando você chega na frase, já escreveu a palavra e o significado dela.

Ao completar uma etapa, ela avança sozinha: sem Enter, sem confirmação. Ao fim da fila vem o
resumo.

Para rever o layout exato das três etapas sem abrir o Raycast: `npm run layout`.

### A régua de aprovação

Ao lado do texto grande há uma fila de etiquetas coloridas — verde o que já foi aprovado,
laranja onde o cursor está, vermelho no instante em que uma tecla é recusada. A régua troca
de granularidade pela presença de espaço: **palavra** vai letra a letra, **frase** vai
palavra a palavra. Letra a letra numa frase de sessenta caracteres viraria dezenas de
etiquetas ilegíveis, várias delas etiquetas de espaço em branco.

### A fila da sessão

A coluna da esquerda mostra as palavras da sessão inteira, com o estado de cada uma: verde
sem nenhuma recusa, amarela com recusa, cinza pulada. O ponteiro `●○○` indica em que etapa
você está. Dá para voltar a qualquer palavra com as setas.

## Revisão espaçada

O que você erra volta rápido; o que você domina some por semanas. É um Leitner de cinco
caixas:

| Caixa | Estado          | Volta em |
| ----- | --------------- | -------- |
| 0     | nunca praticada | —        |
| 1     | escorrega       | 20 min   |
| 2     | aprendendo      | 1 dia    |
| 3     | firmando        | 3 dias   |
| 4     | quase lá        | 7 dias   |
| 5     | dominada        | 21 dias  |

Terminar a palavra inteira sem nenhuma tecla recusada sobe uma caixa. Uma ou duas recusas
mantêm. Três ou mais derrubam para a caixa 1.

No máximo 60% de cada sessão é revisão. Sem esse teto, quem já praticou bastante nunca mais
veria uma palavra nova — o vício clássico de agendador Leitner cru.

## As contas

**Velocidade (PPM).** Padrão da indústria: cinco caracteres valem uma palavra, somando as
três etapas. Pausa maior que oito segundos não entra na conta — atender ao telefone no meio
da sessão não pode transformar o seu número em ficção.

**Precisão.** Caracteres do alvo sobre caracteres do alvo mais teclas recusadas. Como o erro
é bloqueado, cada recusa é um evento único e contável: não existe a ambiguidade de "errou,
apagou e escreveu certo".

**Média geral.** Ponderada pelo volume, não pela contagem de sessões — uma sessão de três
palavras não pesa igual a uma de quinze.

## Preferências

| Preferência                   | Padrão                              | Para que serve                                            |
| ----------------------------- | ----------------------------------- | --------------------------------------------------------- |
| O que digitar de cada palavra | A palavra, o significado e a frase  | Ou só palavra + significado, ou só a palavra              |
| Nível do vocabulário          | Todos                               | 1 cotidiano com armadilha · 2 culto · 3 erudito           |
| Tamanho da sessão             | 10                                  | 5, 10, 15 ou 25 palavras até o resumo                     |
| Exigir acentuação e cedilha   | Ligado                              | Desligado, `efemero` vale por `efêmero` e `aco` por `aço` |
| Diferenciar maiúsculas        | Desligado                           | Ligado, `Efêmero` não vale por `efêmero`                  |
| Priorizar o que você erra     | Ligado                              | Desligado, a fila vira sorteio puro                       |

## Atalhos dentro da prática

| Atalho  | Ação                     |
| ------- | ------------------------ |
| `⏎`     | Recomeçar esta etapa     |
| `⌘⏎`    | Pular esta palavra       |
| `⌘E`    | Encerrar e ver o resumo  |
| `⌘R`    | Nova sessão              |
| `⌘C`    | Copiar a palavra         |
| `⌘⌥C`   | Copiar o verbete inteiro |
| `⌘⇧V`   | Abrir o vocabulário      |
| `⌘⇧P`   | Ver meu progresso        |

No Windows, `⌘` vira `Ctrl` e `⌥` vira `Alt`: todos os atalhos são declarados por
plataforma em `src/nucleo/atalhos.ts`.

## Onde ficam os seus dados

Tudo em `LocalStorage` do Raycast, na sua máquina, em três chaves: `progresso.v1` (histórico
por palavra), `sessoes.v1` (últimas 200 sessões) e `recordes.v1`. Nada sai do computador.
*Meu Progresso* tem a ação de apagar tudo, com confirmação.

O progresso é gravado **a cada palavra concluída**, não ao final da sessão: fechar o Raycast
no meio não apaga o que você já praticou.

## Acrescentar palavras

O léxico é um único arquivo: `src/dados/lexico.json`.

```json
{
  "palavra": "efêmero",
  "classe": "adjetivo",
  "significado": "que dura muito pouco tempo",
  "exemplo": "A fama viral é efêmera: some antes de virar memória.",
  "nivel": 1
}
```

Como agora o significado também é digitado, ele passou a ser texto de treino: escreva-o
começando em minúscula, sem ponto final, e curto o bastante para não virar castigo. A frase
de exemplo contém a palavra (flexionada, se for o caso), tem pontuação final e não passa de
90 caracteres. Nenhum dos três campos pode conter `* _ \` [ ] ~ |` — são caracteres que o
Markdown interpretaria dentro da linha grande, e há um teste que reprova se aparecerem.

## Rodar em desenvolvimento

```bash
npm install
npm test         # 44 testes do núcleo
npm run layout   # imprime o markdown das três etapas
npm run dev      # abre no Raycast com hot reload
npm run lint
npm run build
```

Para publicar na Store, troque `author` no `package.json` pelo seu usuário do Raycast — é a
única coisa que o `ray lint` ainda reprova.
