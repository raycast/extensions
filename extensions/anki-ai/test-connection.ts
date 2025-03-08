import { useFlashcardGenerator } from "./src/hooks/useFlashcardGenerator";
import { AnkiRepository } from "./src/anki/ankiRepository";
import { Logger } from "./src/utils/logger";

// Configurar logger para console
Logger.debug = console.log;
Logger.error = console.error;
Logger.warn = console.warn;
Logger.info = console.log;
Logger.ankiRequest = () => {};

async function testConnection() {
  console.log("Iniciando teste de conexão com o Anki...");

  try {
    // Teste direto usando AnkiRepository
    console.log("\n1. Testando conexão básica com AnkiConnect...");
    const isRunning = await AnkiRepository.isAnkiRunning();
    console.log(`Anki está rodando: ${isRunning}`);

    if (!isRunning) {
      console.error("O Anki não está rodando. Por favor, abra o Anki e tente novamente.");
      return;
    }

    console.log("\n2. Testando conexão completa com AnkiConnect...");
    const connectionTest = await AnkiRepository.testConnection();
    console.log("Resultado do teste de conexão:", connectionTest);

    if (!connectionTest.success) {
      console.error("Falha no teste de conexão completa. Verifique os detalhes acima.");
      return;
    }

    console.log("\n3. Obtendo lista de decks...");
    const decksResponse = await AnkiRepository.getDecks();
    if (decksResponse.error) {
      console.error(`Erro ao obter decks: ${decksResponse.error}`);
    } else {
      console.log(`Decks disponíveis: ${decksResponse.result.length}`);
      console.log(decksResponse.result);
    }

    console.log("\n4. Obtendo lista de modelos...");
    const modelsResponse = await AnkiRepository.modelNames();
    if (modelsResponse.error) {
      console.error(`Erro ao obter modelos: ${modelsResponse.error}`);
    } else {
      console.log(`Modelos disponíveis: ${modelsResponse.result.length}`);
      console.log(modelsResponse.result);
    }

    console.log("\n5. Verificando campos do modelo 'Básico'...");
    const fieldsResponse = await AnkiRepository.modelFieldNames("Básico");
    if (fieldsResponse.error) {
      console.error(`Erro ao obter campos do modelo: ${fieldsResponse.error}`);
    } else {
      console.log(`Campos do modelo 'Básico': ${fieldsResponse.result.length}`);
      console.log(fieldsResponse.result);
    }

    console.log("\n6. Testando adição de nota com o modelo 'Básico'...");
    const noteResponse = await AnkiRepository.addNote({
      deckName: "Teste_Raycast_Conexao",
      modelName: "Básico",
      fields: {
        Frente: "Teste de conexão da extensão",
        Verso: "Funcionando corretamente!",
      },
      tags: ["teste", "raycast", "extensao"],
    });

    if (noteResponse.error) {
      console.error(`Erro ao adicionar nota: ${noteResponse.error}`);
    } else {
      console.log(`Nota adicionada com sucesso! ID: ${noteResponse.result}`);
    }

    console.log("\nTeste de conexão concluído com sucesso!");
  } catch (error) {
    console.error("Erro durante o teste de conexão:", error);
  }
}

// Executar o teste
testConnection();
