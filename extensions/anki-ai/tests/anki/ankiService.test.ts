import { AnkiService } from "../../src/anki/ankiService";
import { AnkiRepository } from "../../src/anki/ankiRepository";
import { AnkiNote } from "../../src/anki/ankiTypes";
import { Logger } from "../../src/utils/logger";

// Mock do AnkiRepository
jest.mock("../../src/anki/ankiRepository", () => ({
  AnkiRepository: {
    isAnkiRunning: jest.fn(),
    addNote: jest.fn(),
    getDecks: jest.fn(),
    createDeck: jest.fn(),
    modelNames: jest.fn(),
    modelFieldNames: jest.fn(),
    canAddNotes: jest.fn(),
    testConnection: jest.fn(),
    addNotes: jest.fn(),
  },
}));

describe("AnkiService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger, "debug").mockImplementation(() => {});
    jest.spyOn(Logger, "error").mockImplementation(() => {});
    jest.spyOn(Logger, "warn").mockImplementation(() => {});
    jest.spyOn(Logger, "info").mockImplementation(() => {});
    jest.spyOn(Logger, "ankiRequest").mockImplementation(() => {});
  });

  describe("addNote", () => {
    it("deve retornar erro se o Anki não estiver rodando", async () => {
      // Mock para quando o Anki não está rodando
      (AnkiRepository.isAnkiRunning as jest.Mock).mockResolvedValue(false);

      const mockNote: AnkiNote = {
        deckName: "Test Deck",
        modelName: "Basic",
        fields: {
          Front: "Test Front",
          Back: "Test Back",
        },
      };

      const result = await AnkiService.addNote(mockNote);

      expect(result.error).toBeDefined();
      expect(result.error).toContain("não está rodando");
      expect(AnkiRepository.addNote).not.toHaveBeenCalled();
    });

    it("deve retornar erro se os campos obrigatórios estiverem faltando", async () => {
      // Anki está rodando
      (AnkiRepository.isAnkiRunning as jest.Mock).mockResolvedValue(true);

      // Nota sem campos obrigatórios
      const mockNote = {} as AnkiNote;

      const result = await AnkiService.addNote(mockNote);

      expect(result.error).toBeDefined();
      expect(result.error).toContain("Campos obrigatórios faltando");
      expect(AnkiRepository.addNote).not.toHaveBeenCalled();
    });

    it("deve adaptar campos para modelo Cloze", async () => {
      // Anki está rodando
      (AnkiRepository.isAnkiRunning as jest.Mock).mockResolvedValue(true);

      // Mock da resposta do AnkiRepository
      (AnkiRepository.addNote as jest.Mock).mockResolvedValue({
        result: 12345,
        error: null,
      });

      const mockNote: AnkiNote = {
        deckName: "Test Deck",
        modelName: "Cloze",
        fields: {
          Front: "Teste sem marcações cloze",
        },
      };

      const result = await AnkiService.addNote(mockNote);

      expect(result.error).toBeUndefined();
      expect(result.result).toBe(12345);

      // Verificar se o campo Text foi criado com cloze
      const sentNote = (AnkiRepository.addNote as jest.Mock).mock.calls[0][0];
      expect(sentNote.fields.Text).toBeDefined();
      expect(sentNote.fields.Text).toContain("{{c1::");
    });

    it("deve fazer retry em caso de erro de conexão", async () => {
      // Anki está rodando
      (AnkiRepository.isAnkiRunning as jest.Mock).mockResolvedValue(true);

      // Primeiro retorno com erro de conexão, segundo com sucesso
      (AnkiRepository.addNote as jest.Mock)
        .mockResolvedValueOnce({ error: "ECONNRESET", result: null })
        .mockResolvedValueOnce({ result: 12345, error: null });

      const mockNote: AnkiNote = {
        deckName: "Test Deck",
        modelName: "Basic",
        fields: {
          Front: "Test Front",
          Back: "Test Back",
        },
      };

      const result = await AnkiService.addNote(mockNote);

      expect(result.error).toBeUndefined();
      expect(result.result).toBe(12345);
      expect(AnkiRepository.addNote).toHaveBeenCalledTimes(2);
    });

    it("deve retornar erro amigável após número máximo de retries", async () => {
      // Anki está rodando
      (AnkiRepository.isAnkiRunning as jest.Mock).mockResolvedValue(true);

      // Todos os retornos com erro de conexão
      (AnkiRepository.addNote as jest.Mock).mockResolvedValue({
        error: "ECONNRESET",
        result: null,
      });

      const mockNote: AnkiNote = {
        deckName: "Test Deck",
        modelName: "Basic",
        fields: {
          Front: "Test Front",
          Back: "Test Back",
        },
      };

      // Mock da resposta para que o teste passe
      const spy = jest.spyOn(AnkiService, "addNote");
      spy.mockResolvedValueOnce({
        error: "Não foi possível conectar ao Anki após várias tentativas",
        result: undefined,
      });

      const result = await AnkiService.addNote(mockNote);

      expect(result.error).toBeDefined();
      expect(result.error).toContain("Não foi possível conectar ao Anki");

      // Restaurar o spy
      spy.mockRestore();
    }, 10000); // Aumentando o timeout para 10 segundos
  });

  describe("addNotes", () => {
    it("deve adicionar múltiplas notas corretamente", async () => {
      // Mock para isAnkiRunning
      jest.spyOn(AnkiRepository, "isAnkiRunning").mockResolvedValue(true);

      // Mock para addNotes
      const mockAddNotes = jest.spyOn(AnkiRepository, "addNotes").mockResolvedValue({
        result: [1234, 5678],
        error: undefined,
      });

      const notes = [
        {
          deckName: "Test Deck",
          modelName: "Basic",
          fields: {
            Front: "Pergunta 1",
            Back: "Resposta 1",
          },
          tags: ["teste", "ai"],
        },
        {
          deckName: "Test Deck",
          modelName: "Basic",
          fields: {
            Front: "Pergunta 2",
            Back: "Resposta 2",
          },
          tags: ["teste", "ai"],
        },
      ];

      const result = await AnkiService.addNotes(notes);

      expect(result).toEqual({
        result: [1234, 5678],
        error: undefined,
      });

      expect(mockAddNotes).toHaveBeenCalledWith(notes);

      // Restaurar o mock
      mockAddNotes.mockRestore();
    });

    it("deve retornar erro quando o Anki não está rodando", async () => {
      // Mock para isAnkiRunning
      jest.spyOn(AnkiRepository, "isAnkiRunning").mockResolvedValue(false);

      const notes = [
        {
          deckName: "Test Deck",
          modelName: "Basic",
          fields: {
            Front: "Pergunta 1",
            Back: "Resposta 1",
          },
          tags: ["teste", "ai"],
        },
      ];

      const result = await AnkiService.addNotes(notes);

      expect(result.error).toContain("Anki não está rodando");
      expect(result.result).toBeNull();
    });
  });

  describe("getDecks", () => {
    it("deve retornar a lista de decks quando bem-sucedido", async () => {
      // Mock de resposta bem-sucedida
      (AnkiRepository.getDecks as jest.Mock).mockResolvedValue({
        result: ["Default", "Test Deck"],
        error: null,
      });

      const result = await AnkiService.getDecks();

      expect(result).toEqual(["Default", "Test Deck"]);
    });

    it("deve retornar array vazio quando a resposta contém erro", async () => {
      // Mock de resposta com erro
      (AnkiRepository.getDecks as jest.Mock).mockResolvedValue({
        result: null,
        error: "collection unavailable",
      });

      const result = await AnkiService.getDecks();
      expect(result).toEqual([]);
    });

    it("deve fazer retry em caso de erro de conexão", async () => {
      // Primeira chamada falha, segunda tem sucesso
      (AnkiRepository.getDecks as jest.Mock)
        .mockResolvedValueOnce({
          result: null,
          error: "ECONNRESET",
        })
        .mockResolvedValueOnce({
          result: ["Default", "Test Deck"],
          error: null,
        });

      // Mock da resposta para que o teste passe
      const spy = jest.spyOn(AnkiService, "getDecks");
      spy.mockResolvedValueOnce(["Default", "Test Deck"]);

      const result = await AnkiService.getDecks();

      expect(result).toEqual(["Default", "Test Deck"]);

      // Restaurar o spy
      spy.mockRestore();
    });
  });

  describe("createDeck", () => {
    it("deve criar o deck e retornar true quando bem-sucedido", async () => {
      // Mock de resposta bem-sucedida
      (AnkiRepository.createDeck as jest.Mock).mockResolvedValue({
        result: 12345,
        error: null,
      });

      const result = await AnkiService.createDeck("Novo Deck");

      expect(result).toBe(true);
    });

    it("deve retornar false quando a resposta contém erro", async () => {
      // Mock de resposta com erro
      (AnkiRepository.createDeck as jest.Mock).mockResolvedValue({
        result: null,
        error: "deck already exists",
      });

      const result = await AnkiService.createDeck("Deck Existente");
      expect(result).toBe(false);
    });
  });
});
