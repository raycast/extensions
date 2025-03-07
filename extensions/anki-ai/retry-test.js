const axios = require("axios");

// URL padrão do AnkiConnect
const ANKI_CONNECT_URL = "http://localhost:8765";

async function testWithRetries() {
  console.log("Teste de conexão com AnkiConnect (com retentativas)");

  // Teste de versão
  try {
    console.log("\n1. Testando versão do AnkiConnect...");
    const versionResponse = await axios.post(
      ANKI_CONNECT_URL,
      {
        action: "version",
        version: 6,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      },
    );

    console.log("Resposta da versão:", versionResponse.data);

    // Se chegou aqui, o teste de versão foi bem-sucedido
    const version = versionResponse.data.result;
    console.log(`Versão do AnkiConnect: ${version}`);

    if (version < 6) {
      console.warn(`AVISO: Versão do AnkiConnect (${version}) é menor que a recomendada (6). Considere atualizar.`);
    }
  } catch (error) {
    console.error("Erro ao verificar versão:", error.message);
    return;
  }

  // Teste de obtenção de decks com retentativas
  console.log("\n2. Testando obtenção de decks (com retentativas)...");
  let success = false;
  let attempts = 0;
  const maxAttempts = 3;

  while (!success && attempts < maxAttempts) {
    attempts++;
    console.log(`Tentativa ${attempts}/${maxAttempts}...`);

    try {
      const decksResponse = await axios.post(
        ANKI_CONNECT_URL,
        {
          action: "deckNames",
          version: 6,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 20000, // Timeout maior
        },
      );

      console.log("Resposta dos decks:", decksResponse.data);

      if (decksResponse.data.error) {
        console.error(`Erro retornado pelo AnkiConnect: ${decksResponse.data.error}`);
      } else {
        const decks = decksResponse.data.result;
        console.log(`Decks encontrados: ${decks.length}`);
        console.log(decks);
        success = true;
      }
    } catch (error) {
      console.error(`Erro na tentativa ${attempts}: ${error.message}`);

      if (attempts < maxAttempts) {
        console.log("Aguardando 2 segundos antes da próxima tentativa...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  if (!success) {
    console.error("Não foi possível obter a lista de decks após várias tentativas.");
    console.log("\nSugestões de solução:");
    console.log("1. Verifique se o Anki está aberto e funcionando corretamente");
    console.log("2. Verifique se o plugin AnkiConnect está instalado e atualizado");
    console.log("3. Reinicie o Anki e tente novamente");
    console.log("4. Verifique se há algum firewall ou antivírus bloqueando a conexão");
    console.log("5. Verifique a configuração do AnkiConnect (Tools > Add-ons > AnkiConnect > Config)");
  } else {
    console.log("\nTeste de obtenção de decks concluído com sucesso!");
  }
}

// Executar o teste
testWithRetries();
