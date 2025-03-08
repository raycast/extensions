const axios = require("axios");

// URL padrão do AnkiConnect
const ANKI_CONNECT_URL = "http://localhost:8765";

async function testSimpleConnection() {
  console.log("Teste simples de conexão com AnkiConnect");

  try {
    console.log("1. Testando versão do AnkiConnect...");
    const versionResponse = await axios.post(
      ANKI_CONNECT_URL,
      {
        action: "version",
        version: 6,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      },
    );

    console.log("Resposta da versão:", versionResponse.data);

    console.log("\n2. Testando obtenção de decks...");
    const decksResponse = await axios.post(
      ANKI_CONNECT_URL,
      {
        action: "deckNames",
        version: 6,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      },
    );

    console.log("Resposta dos decks:", decksResponse.data);

    console.log("\n3. Testando obtenção de modelos...");
    const modelsResponse = await axios.post(
      ANKI_CONNECT_URL,
      {
        action: "modelNames",
        version: 6,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      },
    );

    console.log("Resposta dos modelos:", modelsResponse.data);

    console.log("\nTodos os testes simples concluídos com sucesso!");
  } catch (error) {
    console.error("Erro durante o teste:", error.message);
    if (error.response) {
      console.error("Dados da resposta:", error.response.data);
    }
  }
}

// Executar o teste
testSimpleConnection();
