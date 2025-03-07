import { showToast } from "@raycast/api";
import aiFlashcardsGenerator from "../../src/tools/ai-flashcards-generator";
import { FlashcardGenerator } from "../../src/ai/flashcardGenerator";
import { AnkiRepository } from "../../src/anki/ankiRepository";

// Mock dos módulos
jest.mock("@raycast/api", () => ({
  showToast: jest.fn().mockResolvedValue(undefined),
  Toast: {
    Style: {
      Animated: "animated",
      Success: "success",
      Failure: "failure",
    },
  },
  getPreferenceValues: jest.fn().mockReturnValue({
    defaultLanguage: "português",
    defaultModel: "",
    defaultDeck: "Default",
    ankiConnectPort: "8765",
    minFlashcards: "5",
    maxFlashcards: "20",
    enableTags: true,
    customPromptTemplate: "",
    debugMode: false,
  }),
}));

jest.mock("../../src/ai/flashcardGenerator", () => ({
  FlashcardGenerator: {
    generate: jest.fn(),
  },
}));

jest.mock("../../src/anki/ankiRepository", () => ({
  AnkiRepository: {
    createRaycastFlashcardsModelIfNeeded: jest.fn().mockResolvedValue({ result: true, error: null }),
    getDecks: jest.fn(),
    addFlashcards: jest.fn(),
  },
}));

jest.mock("../../src/utils/errorHandler", () => ({
  ErrorHandler: {
    handle: jest.fn(),
  },
}));

jest.mock("../../src/utils/logger", () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setDebugMode: jest.fn(),
  },
}));

describe("AI Flashcards Generator Tool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve mostrar erro quando nenhum texto é fornecido", async () => {
    await aiFlashcardsGenerator({ arguments: { text: "" } });

    expect(showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Texto não fornecido",
      message: "Por favor, forneça um texto para gerar flashcards",
    });
  });

  it(
    "deve gerar flashcards e adicioná-los ao Anki com sucesso",
    async () => {
      // Mock dos flashcards gerados
      const mockFlashcards = [
        { front: "Pergunta 1", back: "Resposta 1", extra: "Extra 1", tags: ["tag1"] },
        { front: "Pergunta 2", back: "Resposta 2", extra: "Extra 2", tags: ["tag2"] },
      ];

      // Mock da resposta do Anki
      const mockDecksResponse = {
        result: ["Default", "Teste"],
        error: null,
      };

      const mockAddResponse = {
        result: [1, 2],
        error: null,
      };

      // Configurar os mocks
      (FlashcardGenerator.generate as jest.Mock).mockResolvedValue(mockFlashcards);
      (AnkiRepository.getDecks as jest.Mock).mockResolvedValue(mockDecksResponse);
      (AnkiRepository.addFlashcards as jest.Mock).mockResolvedValue(mockAddResponse);

      // Chamar a ferramenta
      await aiFlashcardsGenerator({ arguments: { text: "Texto de teste" } });

      // Verificar se os métodos foram chamados corretamente
      expect(FlashcardGenerator.generate).toHaveBeenCalledWith(
        "Texto de teste",
        expect.objectContaining({
          language: "português",
          minFlashcards: 5,
          maxFlashcards: 20,
          enableTags: true,
        }),
      );

      expect(AnkiRepository.createRaycastFlashcardsModelIfNeeded).toHaveBeenCalled();
      expect(AnkiRepository.getDecks).toHaveBeenCalled();
      expect(AnkiRepository.addFlashcards).toHaveBeenCalledWith(mockFlashcards, "Default", "Raycast Flashcards");

      // Verificar se o toast de sucesso foi mostrado
      expect(showToast).toHaveBeenCalledWith({
        style: "success",
        title: "2 flashcard(s) adicionado(s) com sucesso",
        message: 'Adicionados ao deck "Default"',
      });
    },
    10000 // 10 second timeout
  );

  it("deve mostrar erro quando a geração de flashcards falha", async () => {
    // Mock para simular falha na geração de flashcards
    (FlashcardGenerator.generate as jest.Mock).mockResolvedValue([]);

    // Chamar a ferramenta
    await aiFlashcardsGenerator({ arguments: { text: "Texto de teste" } });

    // Verificar se o toast de erro foi mostrado
    expect(showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Falha ao gerar flashcards",
      message: "Nenhum flashcard foi gerado. Tente com outro texto.",
    });
  });

  it("deve mostrar erro quando a conexão com o Anki falha", async () => {
    // Mock dos flashcards gerados
    const mockFlashcards = [{ front: "Pergunta 1", back: "Resposta 1", extra: "Extra 1" }];

    // Mock da resposta do Anki com erro
    const mockDecksResponse = {
      result: null,
      error: "Falha na conexão com o Anki",
    };

    // Configurar os mocks
    (FlashcardGenerator.generate as jest.Mock).mockResolvedValue(mockFlashcards);
    (AnkiRepository.getDecks as jest.Mock).mockResolvedValue(mockDecksResponse);

    // Chamar a ferramenta
    await aiFlashcardsGenerator({ arguments: { text: "Texto de teste" } });

    // Verificar se o toast de erro foi mostrado
    expect(showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Falha ao obter decks do Anki",
      message: "Verifique se o Anki está aberto e o AnkiConnect instalado",
    });
  });

  it("deve mostrar erro quando falha ao adicionar flashcards ao Anki", async () => {
    // Mock dos flashcards gerados
    const mockFlashcards = [{ front: "Pergunta 1", back: "Resposta 1", extra: "Extra 1" }];

    // Mock das respostas do Anki
    const mockDecksResponse = {
      result: ["Default"],
      error: null,
    };

    const mockAddResponse = {
      result: null,
      error: "Falha ao adicionar flashcards",
    };

    // Configurar os mocks
    (FlashcardGenerator.generate as jest.Mock).mockResolvedValue(mockFlashcards);
    (AnkiRepository.getDecks as jest.Mock).mockResolvedValue(mockDecksResponse);
    (AnkiRepository.addFlashcards as jest.Mock).mockResolvedValue(mockAddResponse);

    // Chamar a ferramenta
    await aiFlashcardsGenerator({ arguments: { text: "Texto de teste" } });

    // Verificar se o toast de erro foi mostrado
    expect(showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Falha ao adicionar flashcards ao Anki",
      message: "Falha ao adicionar flashcards",
    });
  });
});
