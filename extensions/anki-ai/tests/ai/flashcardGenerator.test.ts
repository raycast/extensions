import { AI } from "@raycast/api";
import { FlashcardGenerator } from "../../src/ai/flashcardGenerator";

// Mock do módulo @raycast/api
jest.mock("@raycast/api", () => ({
  AI: {
    ask: jest.fn(),
    Model: {
      GPT3_5: "gpt-3.5-turbo",
      GPT4: "gpt-4",
      CLAUDE: "claude-3-opus-20240229"
    }
  },
  Toast: {
    Style: {
      Failure: "failure",
      Success: "success",
      Animated: "animated"
    }
  },
  showToast: jest.fn(),
  getPreferenceValues: jest.fn().mockReturnValue({
    defaultLanguage: "português",
    defaultModel: "",
    minFlashcards: "5",
    maxFlashcards: "20",
    enableTags: true,
    customPromptTemplate: "",
    debugMode: false
  })
}));

describe("FlashcardGenerator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve gerar flashcards com configurações padrão", async () => {
    // Mock da resposta da IA
    const mockResponse = JSON.stringify([
      {
        front: "O que é o Sistema Solar?",
        back: "O Sistema Solar é o sistema planetário que inclui a Terra e outros corpos celestes que orbitam o Sol.",
        extra: "O Sistema Solar inclui oito planetas, vários planetas anões, luas, asteroides e cometas."
      },
      {
        front: "Qual é o planeta mais próximo do Sol?",
        back: "Mercúrio",
        extra: "Mercúrio é o menor planeta do Sistema Solar e o mais próximo do Sol, com uma órbita de 88 dias terrestres."
      }
    ]);

    // Configurar o mock do AI.ask para retornar a resposta mockada
    (AI.ask as jest.Mock).mockResolvedValue(mockResponse);

    // Chamar o método generate
    const flashcards = await FlashcardGenerator.generate("Sistema Solar");

    // Verificar se o AI.ask foi chamado corretamente
    expect(AI.ask).toHaveBeenCalled();
    
    // Verificar se os flashcards foram gerados corretamente
    expect(flashcards).toHaveLength(2);
    expect(flashcards[0].front).toBe("O que é o Sistema Solar?");
    expect(flashcards[0].back).toBe("O Sistema Solar é o sistema planetário que inclui a Terra e outros corpos celestes que orbitam o Sol.");
    expect(flashcards[0].tags).toEqual([]);
  });

  it("deve respeitar o número máximo de flashcards", async () => {
    // Mock da resposta da IA com mais flashcards do que o máximo
    const mockFlashcards = Array.from({ length: 25 }, (_, i) => ({
      front: `Pergunta ${i + 1}`,
      back: `Resposta ${i + 1}`,
      extra: `Informação extra ${i + 1}`
    }));

    // Configurar o mock do AI.ask para retornar a resposta mockada
    (AI.ask as jest.Mock).mockResolvedValue(JSON.stringify(mockFlashcards));

    // Chamar o método generate com maxFlashcards = 10
    const flashcards = await FlashcardGenerator.generate("Texto de teste", {
      maxFlashcards: 10
    });

    // Verificar se o número de flashcards foi limitado corretamente
    expect(flashcards).toHaveLength(10);
  });

  it("deve usar o modelo de IA especificado", async () => {
    // Configurar o mock do AI.ask para retornar uma resposta simples
    (AI.ask as jest.Mock).mockResolvedValue(JSON.stringify([
      { front: "Pergunta", back: "Resposta" }
    ]));

    // Chamar o método generate com um modelo específico
    await FlashcardGenerator.generate("Texto de teste", {
      model: "GPT4"
    });

    // Verificar se o AI.ask foi chamado com o modelo correto
    expect(AI.ask).toHaveBeenCalledWith(expect.any(String), {
      model: "gpt-4",
      creativity: 1
    });
  });

  it("deve usar o template de prompt personalizado", async () => {
    // Configurar o mock do AI.ask para retornar uma resposta simples
    (AI.ask as jest.Mock).mockResolvedValue(JSON.stringify([
      { front: "Pergunta", back: "Resposta" }
    ]));

    // Template de prompt personalizado
    const customPrompt = "Gere flashcards para o texto: {text}. Idioma: {language}";

    // Chamar o método generate com um prompt personalizado
    await FlashcardGenerator.generate("Texto de teste", {
      customPrompt
    });

    // Verificar se o AI.ask foi chamado com o prompt personalizado
    const expectedPrompt = "Gere flashcards para o texto: Texto de teste. Idioma: português";
    expect(AI.ask).toHaveBeenCalledWith(expectedPrompt, expect.any(Object));
  });

  it("deve lidar com respostas inválidas da IA", async () => {
    // Configurar o mock do AI.ask para retornar uma resposta inválida
    (AI.ask as jest.Mock).mockResolvedValue("Isso não é um JSON válido");

    // Chamar o método generate
    const flashcards = await FlashcardGenerator.generate("Texto de teste");

    // Verificar se o resultado é um array vazio
    expect(flashcards).toEqual([]);
  });

  it("deve lidar com erros durante a geração", async () => {
    // Configurar o mock do AI.ask para lançar um erro
    (AI.ask as jest.Mock).mockRejectedValue(new Error("Erro de teste"));

    // Chamar o método generate
    const flashcards = await FlashcardGenerator.generate("Texto de teste");

    // Verificar se o resultado é um array vazio
    expect(flashcards).toEqual([]);
  });
});
