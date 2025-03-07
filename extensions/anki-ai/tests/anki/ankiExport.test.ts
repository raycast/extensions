import { AnkiRepository } from "../../src/anki/ankiRepository";
import { Flashcard } from "../../src/ai/flashcardGenerator";

describe("Anki Export Tests", () => {
  const testFlashcards: Flashcard[] = [
    {
      front: "O que é TypeScript?",
      back: "TypeScript é um superset do JavaScript que adiciona tipagem estática.",
      extra: "Desenvolvido pela Microsoft, ajuda a evitar erros comuns de tipo.",
    },
    {
      front: "Como declarar uma variável em TypeScript?",
      back: "Use let, const ou var seguido do nome e tipo opcional: let nome: string",
      extra: "Exemplo: const idade: number = 25;",
    },
  ];

  beforeAll(async () => {
    // Garantir que o Anki está rodando e acessível
    const connection = await AnkiRepository.testConnection();
    if (!connection.success) {
      throw new Error(`Anki não está acessível: ${connection.message}`);
    }
  });

  test("Deve mapear campos corretamente para o modelo Básico", async () => {
    const modelName = "Básico";
    const flashcard = testFlashcards[0];

    const fields = await AnkiRepository.mapFlashcardToModelFields(flashcard, modelName);

    expect(fields).toBeDefined();
    expect(fields["Frente"]).toBe(flashcard.front);
    expect(fields["Verso"]).toBe(flashcard.back);
  });

  test("Deve criar deck se não existir", async () => {
    const deckName = "Teste_Raycast_" + Date.now();
    const response = await AnkiRepository.createDeck(deckName);

    expect(response.error).toBeNull();
    expect(response.result).toBeDefined();
  });

  test("Deve adicionar flashcards ao Anki", async () => {
    const deckName = "Teste_Raycast_" + Date.now();
    const modelName = "Básico";
    const tags = ["teste", "raycast"];

    const response = await AnkiRepository.addFlashcards(testFlashcards, deckName, modelName, tags);

    expect(response.error).toBeNull();
    expect(Array.isArray(response.result)).toBe(true);
    expect(response.result?.length).toBe(testFlashcards.length);
    expect(response.result?.every((id) => id !== null)).toBe(true);
  });

  test("Deve lidar com campos vazios apropriadamente", async () => {
    const emptyFlashcard: Flashcard = {
      front: "",
      back: "Apenas verso",
      extra: "Informação extra",
    };

    const modelName = "Básico";

    await expect(AnkiRepository.mapFlashcardToModelFields(emptyFlashcard, modelName)).rejects.toThrow(
      "Os seguintes campos estão vazios",
    );
  });

  test("Deve validar modelo inexistente", async () => {
    const modelName = "ModeloInexistente";
    const flashcard = testFlashcards[0];

    await expect(AnkiRepository.mapFlashcardToModelFields(flashcard, modelName)).rejects.toThrow(
      "Erro ao obter campos do modelo",
    );
  });
});
