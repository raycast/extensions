import { AnkiRepository } from "./ankiRepository";
import { AnkiNote } from "./ankiTypes";
import { Logger } from "../utils/logger";

export class AnkiService {
  /**
   * Adiciona uma nova nota ao Anki
   * @param note Objeto de nota a ser adicionado
   * @returns ID da nota adicionada ou mensagem de erro
   */
  static async addNote(note: AnkiNote): Promise<{ result?: number; error?: string }> {
    try {
      Logger.debug("AnkiService.addNote chamado com nota", note);

      // Verificar se o Anki está rodando
      const isRunning = await AnkiRepository.isAnkiRunning();
      if (!isRunning) {
        return {
          error:
            "O Anki não está rodando ou o AnkiConnect não está instalado. Por favor, abra o Anki e verifique se o AnkiConnect está instalado. Para instalar o AnkiConnect, abra o Anki, vá em Ferramentas > Complementos > Obter Complementos e digite o código 2055492159.",
        };
      }

      // Validar a nota antes de enviar
      if (!note.deckName || !note.modelName || !note.fields) {
        return { error: "Campos obrigatórios faltando: deckName, modelName ou fields" };
      }

      // Garantir que pelo menos um campo tenha conteúdo
      const hasContent = Object.values(note.fields).some(
        (value) => value !== undefined && value !== null && value !== "",
      );

      if (!hasContent) {
        return { error: "Pelo menos um campo deve ter conteúdo" };
      }

      // Para modelo Cloze, garantir que Text exista
      if (note.modelName === "Cloze") {
        if (!note.fields.Text) {
          // Tentar usar o Frente ou Front como Text se estiver disponível
          if (note.fields.Frente) {
            note.fields.Text = note.fields.Frente;
            delete note.fields.Frente;
          } else if (note.fields.Front) {
            note.fields.Text = note.fields.Front;
            delete note.fields.Front;
          } else {
            return { error: "Para o modelo Cloze, o campo Text é obrigatório" };
          }
        }

        // Verificar se o texto já contém marcações de cloze
        const hasClozeMarkers = /\{\{c\d+::.+?\}\}/i.test(note.fields.Text);

        if (!hasClozeMarkers) {
          // Se não tiver marcações de cloze, tentar criar uma básica
          note.fields.Text = `{{c1::${note.fields.Text}}}`;
        }
      }

      // Enviar para o AnkiRepository - com retry para erros de conexão
      let response: { result?: number; error?: string } | undefined;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        response = await AnkiRepository.addNote(note);

        // Se não houve erro ou o erro não é de conexão, sair do loop
        if (
          !response?.error ||
          (!response.error.includes("ECONNRESET") &&
            !response.error.includes("Falha na comunicação") &&
            !response.error.includes("Timeout"))
        ) {
          break;
        }

        // Se temos mais tentativas, aguardar e tentar novamente
        if (retryCount < maxRetries) {
          Logger.debug(`Erro de conexão ao adicionar nota, tentando novamente (${retryCount + 1}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, 2000 * Math.pow(2, retryCount)));
          retryCount++;
        } else {
          break;
        }
      }

      // Se não recebemos resposta do AnkiRepository
      if (!response) {
        return {
          error: "Não foi obtida resposta do AnkiConnect após várias tentativas.",
        };
      }

      if (response.error) {
        Logger.error("Erro ao adicionar nota:", response.error);

        // Fazer o erro mais amigável se for um erro de conexão
        if (
          response.error.includes("ECONNRESET") ||
          response.error.includes("Falha na comunicação") ||
          response.error.includes("Timeout")
        ) {
          return {
            error: "Não foi possível conectar ao Anki. Verifique se o Anki está aberto e o AnkiConnect está instalado.",
          };
        }

        // Tratar erros específicos do AnkiConnect
        if (response.error.includes("collection is not available")) {
          return {
            error:
              "O Anki está aberto, mas a coleção não está disponível. Verifique se há algum diálogo aberto no Anki ou se a coleção está sendo sincronizada.",
          };
        }

        if (response.error.includes("deck was not found")) {
          return {
            error: "O deck especificado não foi encontrado. Verifique o nome do deck ou crie-o primeiro.",
          };
        }

        if (response.error.includes("model was not found")) {
          return {
            error: "O modelo de nota especificado não foi encontrado. Verifique o nome do modelo.",
          };
        }

        if (response.error.includes("cannot create note")) {
          return {
            error:
              "Não foi possível criar a nota. Verifique se todos os campos obrigatórios estão preenchidos corretamente.",
          };
        }

        return { error: response.error };
      }

      if (response.result === null || response.result === undefined) {
        Logger.error("Resposta do AnkiConnect não contém ID da nota");
        return { error: "Resposta do AnkiConnect não contém ID da nota" };
      }

      Logger.debug("Nota adicionada com sucesso, ID:", response.result);
      return { result: response.result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error("Erro ao adicionar nota:", errorMessage);

      // Melhorar mensagem para erros comuns
      if (
        errorMessage.includes("ECONNRESET") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("network error")
      ) {
        return {
          error: "Erro de conexão com o Anki. Verifique se o Anki está aberto e o AnkiConnect está instalado.",
        };
      }

      return { error: `Erro ao adicionar nota: ${errorMessage}` };
    }
  }

  /**
   * Adiciona múltiplas notas ao Anki
   * @param notes Array de objetos de nota a serem adicionados
   * @returns Objeto com array de IDs das notas adicionadas ou mensagem de erro
   */
  static async addNotes(notes: AnkiNote[]): Promise<{ result: number[] | null; error: string | undefined }> {
    try {
      // Verificar se o Anki está rodando
      const isRunning = await AnkiRepository.isAnkiRunning();
      if (!isRunning) {
        Logger.error("Anki não está rodando");
        return {
          result: null,
          error:
            "O Anki não está rodando ou o AnkiConnect não está instalado. Por favor, abra o Anki e verifique se o AnkiConnect está instalado. Para instalar o AnkiConnect, abra o Anki, vá em Ferramentas > Complementos > Obter Complementos e digite o código 2055492159.",
        };
      }

      // Verificar se há notas para adicionar
      if (!notes || notes.length === 0) {
        Logger.error("Nenhuma nota para adicionar");
        return { result: null, error: "Nenhuma nota para adicionar" };
      }

      // Adicionar as notas
      const response = await AnkiRepository.addNotes(notes);

      if (response.error) {
        Logger.error(`Erro ao adicionar notas: ${response.error}`);
        return { result: null, error: response.error };
      }

      return { result: response.result, error: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Erro ao adicionar notas: ${errorMessage}`);
      return { result: null, error: errorMessage };
    }
  }

  /**
   * Obtém a lista de decks disponíveis no Anki
   * @returns Array de nomes de decks
   */
  static async getDecks(): Promise<string[]> {
    try {
      const response = await AnkiRepository.getDecks();

      if (response.error) {
        Logger.error(`Erro ao obter decks: ${response.error}`);
        return [];
      }

      if (!Array.isArray(response.result)) {
        Logger.error("Resposta inválida ao obter decks (não é um array)");
        return [];
      }

      return response.result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Erro ao obter decks: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Cria um novo deck no Anki
   * @param deckName Nome do deck a ser criado
   * @returns true se o deck foi criado com sucesso
   */
  static async createDeck(deckName: string): Promise<boolean> {
    try {
      if (!deckName || deckName.trim() === "") {
        Logger.error("Nome do deck inválido");
        return false;
      }

      const response = await AnkiRepository.createDeck(deckName);

      if (response.error) {
        Logger.error(`Erro ao criar deck: ${response.error}`);
        return false;
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Erro ao criar deck: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Obtém a lista de modelos disponíveis no Anki
   * @returns Array de nomes de modelos
   */
  static async getModelNames(): Promise<string[]> {
    try {
      const response = await AnkiRepository.modelNames();

      if (response.error) {
        Logger.error(`Erro ao obter modelos: ${response.error}`);
        return [];
      }

      if (!Array.isArray(response.result)) {
        Logger.error("Resposta inválida ao obter modelos (não é um array)");
        return [];
      }

      return response.result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Erro ao obter modelos: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Obtém os nomes dos campos para um modelo específico
   * @param modelName Nome do modelo
   * @returns Array de nomes de campos
   */
  static async getModelFieldNames(modelName: string): Promise<string[]> {
    try {
      if (!modelName || modelName.trim() === "") {
        Logger.error("Nome do modelo inválido");
        return [];
      }

      const response = await AnkiRepository.modelFieldNames(modelName);

      if (response.error) {
        Logger.error(`Erro ao obter campos do modelo: ${response.error}`);
        return [];
      }

      if (!Array.isArray(response.result)) {
        Logger.error("Resposta inválida ao obter campos do modelo (não é um array)");
        return [];
      }

      return response.result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Erro ao obter campos do modelo: ${errorMessage}`);
      return [];
    }
  }
}
