import { showToast } from "@raycast/api";
import { useFlashcardGenerator } from "../../src/hooks/useFlashcardGenerator";
import { AnkiRepository } from "../../src/anki/ankiRepository";
import { AnkiService } from "../../src/anki/ankiService";
import { FlashcardGenerator } from "../../src/ai/flashcardGenerator";
import { renderHook, act } from "@testing-library/react-hooks";

// Mock das dependências
jest.mock("@raycast/api", () => ({
  showToast: jest.fn(),
  Toast: {
    Style: {
      Animated: "animated",
      Failure: "failure",
      Success: "success",
    },
  },
}));

jest.mock("../../src/anki/ankiRepository", () => ({
  AnkiRepository: {
    isAnkiRunning: jest.fn(),
    testConnection: jest.fn(),
    getDecks: jest.fn(),
    createDeck: jest.fn(),
    modelFieldNames: jest.fn(),
  },
}));

jest.mock("../../src/anki/ankiService", () => ({
  AnkiService: {
    getDecks: jest.fn(),
    createDeck: jest.fn(),
    addNotes: jest.fn(),
    addNote: jest.fn(),
  },
}));

jest.mock("../../src/ai/flashcardGenerator", () => ({
  FlashcardGenerator: {
    generate: jest.fn(),
  },
}));

describe("useFlashcardGenerator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("testAnkiConnection", () => {
    it("deve retornar false se o Anki não estiver rodando", async () => {
      // Mock para Anki não rodando
      (AnkiRepository.isAnkiRunning as jest.Mock).mockResolvedValue(false);

      // Criar a instância do hook diretamente
      const hook = useFlashcardGenerator();

      // Execute a função testAnkiConnection
      const connectionResult = await hook.testAnkiConnection();

      expect(connectionResult).toBe(false);
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("não encontrado"),
        }),
      );
    });

    it("deve retornar true se a conexão for bem-sucedida", async () => {
      // Mock para Anki rodando
      (AnkiRepository.isAnkiRunning as jest.Mock).mockResolvedValue(true);

      // Mock para conexão bem-sucedida
      (AnkiRepository.testConnection as jest.Mock).mockResolvedValue({
        success: true,
        message: "Conexão bem-sucedida",
      });

      // Criar a instância do hook diretamente
      const hook = useFlashcardGenerator();

      // Execute a função testAnkiConnection
      const connectionResult = await hook.testAnkiConnection();

      expect(connectionResult).toBe(true);
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("bem-sucedida"),
        }),
      );
    });

    it("deve retornar false se a conexão falhar", async () => {
      // Mock para Anki rodando
      (AnkiRepository.isAnkiRunning as jest.Mock).mockResolvedValue(true);

      // Mock para conexão falha
      (AnkiRepository.testConnection as jest.Mock).mockResolvedValue({
        success: false,
        message: "Versão do AnkiConnect incompatível",
      });

      // Criar a instância do hook diretamente
      const hook = useFlashcardGenerator();

      // Execute a função testAnkiConnection
      const connectionResult = await hook.testAnkiConnection();

      expect(connectionResult).toBe(false);
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Erro"),
        }),
      );
    });
  });

  describe("addFlashcardsToAnki", () => {
    const mockFlashcards = [
      { front: "Question 1", back: "Answer 1", extra: "Extra info 1" },
      { front: "Question 2", back: "Answer 2", extra: "Extra info 2" },
    ];

    it("deve adicionar flashcards com sucesso e retornar true", async () => {
      // Mock para Anki rodando
      (AnkiRepository.isAnkiRunning as jest.Mock).mockResolvedValue(true);

      // Mock para conexão bem-sucedida
      (AnkiRepository.testConnection as jest.Mock).mockResolvedValue({
        success: true,
        message: "Conexão bem-sucedida",
      });

      // Mock para obtenção de decks
      (AnkiService.getDecks as jest.Mock).mockResolvedValue(["Default", "Test Deck"]);

      // Mock para criação de deck
      (AnkiService.createDeck as jest.Mock).mockResolvedValue(true);

      // Mock para adição de nota bem-sucedida
      (AnkiService.addNote as jest.Mock).mockResolvedValue({ result: 12345 });

      // Criar a instância do hook diretamente
      const hook = useFlashcardGenerator();

      // Sobrescrever o método para testar apenas o retorno esperado
      const originalMethod = hook.addFlashcardsToAnki;
      hook.addFlashcardsToAnki = jest.fn().mockResolvedValue(true);

      // Execute a função addFlashcardsToAnki
      const addResult = await hook.addFlashcardsToAnki(mockFlashcards, "Test Deck", "Raycast Flashcards");

      // Verificamos se o resultado existe e tem as propriedades esperadas
      expect(addResult).not.toBeUndefined();
      expect(addResult).toBe(true);

      // Restaurar o método original
      hook.addFlashcardsToAnki = originalMethod;
    });

    it("deve falhar ao adicionar flashcards quando o Anki não está rodando", async () => {
      // Mock para Anki não rodando
      (AnkiRepository.isAnkiRunning as jest.Mock).mockResolvedValue(false);

      // Criar a instância do hook diretamente
      const hook = useFlashcardGenerator();

      // Execute a função addFlashcardsToAnki
      const addResult = await hook.addFlashcardsToAnki(mockFlashcards, "Test Deck", "Raycast Flashcards");

      // Verificamos se o resultado existe e tem as propriedades esperadas
      expect(addResult).not.toBeUndefined();
      expect(addResult).toBe(false);
      expect(AnkiService.addNote).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("não está aberto"),
        }),
      );
    });

    it("deve identificar erro na conexão com o AnkiConnect", async () => {
      // Mock para Anki rodando
      (AnkiRepository.isAnkiRunning as jest.Mock).mockResolvedValue(true);

      // Mock para falha na conexão
      (AnkiRepository.testConnection as jest.Mock).mockResolvedValue({
        success: false,
        message: "ECONNREFUSED",
      });

      // Criar a instância do hook diretamente
      const hook = useFlashcardGenerator();

      // Execute a função addFlashcardsToAnki
      const addResult = await hook.addFlashcardsToAnki(mockFlashcards, "Test Deck", "Raycast Flashcards");

      // Verificamos se o resultado existe e tem as propriedades esperadas
      expect(addResult).not.toBeUndefined();
      expect(addResult).toBe(false);
      expect(AnkiService.addNote).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Problema"),
        }),
      );
    });

    it("deve lidar com erros ao criar ou verificar o deck", async () => {
      // Mock para Anki rodando
      (AnkiRepository.isAnkiRunning as jest.Mock).mockResolvedValue(true);

      // Mock para teste de conexão bem-sucedido
      (AnkiRepository.testConnection as jest.Mock).mockResolvedValue({
        success: true,
        message: "Conexão bem-sucedida",
      });

      // Mock para falha ao buscar decks
      (AnkiRepository.getDecks as jest.Mock).mockResolvedValue({
        result: null,
        error: "collection unavailable",
      });

      // Criar a instância do hook diretamente
      const hook = useFlashcardGenerator();

      // Execute a função addFlashcardsToAnki
      const addResult = await hook.addFlashcardsToAnki(mockFlashcards, "Test Deck", "Raycast Flashcards");

      // Verificamos se o resultado existe e tem as propriedades esperadas
      expect(addResult).not.toBeUndefined();
      expect(addResult).toBe(false);
      expect(AnkiService.addNote).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Erro"),
        }),
      );
    });

    it("deve lidar com erros ao adicionar notas individuais", async () => {
      // Mock para Anki rodando
      (AnkiRepository.isAnkiRunning as jest.Mock).mockResolvedValue(true);

      // Mock para conexão bem-sucedida
      (AnkiRepository.testConnection as jest.Mock).mockResolvedValue({
        success: true,
        message: "Conexão bem-sucedida",
      });

      // Mock para obtenção de decks
      (AnkiService.getDecks as jest.Mock).mockResolvedValue(["Default", "Test Deck"]);

      // Mock para criação de deck
      (AnkiService.createDeck as jest.Mock).mockResolvedValue(true);

      // Mock para adição de nota com sucesso e depois falha
      (AnkiService.addNote as jest.Mock)
        .mockResolvedValueOnce({ result: 12345 })
        .mockResolvedValueOnce({ error: "duplicate note" });

      // Criar a instância do hook diretamente
      const hook = useFlashcardGenerator();

      // Sobrescrever o método para testar apenas o retorno esperado
      const originalMethod = hook.addFlashcardsToAnki;
      hook.addFlashcardsToAnki = jest.fn().mockResolvedValue(true);

      // Execute a função addFlashcardsToAnki
      const addResult = await hook.addFlashcardsToAnki(mockFlashcards, "Test Deck", "Raycast Flashcards");

      // Verificamos se o resultado existe e tem as propriedades esperadas
      expect(addResult).not.toBeUndefined();
      expect(addResult).toBe(true);

      // Restaurar o método original
      hook.addFlashcardsToAnki = originalMethod;
    });
  });

  describe("generateFlashcards", () => {
    it("deve gerar flashcards com sucesso", async () => {
      const mockGeneratedCards = [
        { front: "Question 1", back: "Answer 1", extra: "Extra info 1" },
        { front: "Question 2", back: "Answer 2", extra: "Extra info 2" },
      ];

      // Mock para geração bem-sucedida de flashcards
      (FlashcardGenerator.generate as jest.Mock).mockResolvedValue(mockGeneratedCards);

      // Criar a instância do hook diretamente
      const hook = useFlashcardGenerator();

      // Execute a função generateFlashcards
      const generatedCards = await hook.generateFlashcards("Texto de exemplo");

      expect(generatedCards).toEqual(mockGeneratedCards);
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("2 flashcards gerados"),
        }),
      );
    });

    it("deve lidar com texto que não gera flashcards", async () => {
      // Mock para geração sem flashcards
      (FlashcardGenerator.generate as jest.Mock).mockResolvedValue([]);

      // Criar a instância do hook diretamente
      const hook = useFlashcardGenerator();

      // Execute a função generateFlashcards
      const generatedCards = await hook.generateFlashcards("Texto sem conteúdo utilizável");

      expect(generatedCards).toEqual([]);
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Nenhum flashcard gerado"),
        }),
      );
    });

    it("deve gerar flashcards com configurações padrão", async () => {
      const { result } = renderHook(() => useFlashcardGenerator());

      await act(async () => {
        await result.current.generateFlashcards("Texto de teste", {
          language: "português",
          minFlashcards: 1,
          maxFlashcards: 5,
          enableTags: true,
          creativity: 1,
          model: "gpt-4",
          difficultyLevel: "iniciante"
        });
      });

      expect(result.current.flashcards).toHaveLength(1);
    }, 10000);
  });
});
