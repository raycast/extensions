import { Logger } from "./logger";
import { showToast, Toast } from "@raycast/api";

export class ErrorHandler {
  static handle(error: unknown, message: string) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`${message}: ${errorMessage}`, error);

    // Exibir toast de erro para o usuário
    showToast({
      style: Toast.Style.Failure,
      title: "Erro",
      message: message || "Ocorreu um erro inesperado",
    });
  }

  static handleAnkiConnectionError() {
    const message =
      "Não foi possível conectar ao Anki. Verifique se o Anki está aberto e se o AnkiConnect está instalado.";
    Logger.error(message);

    showToast({
      style: Toast.Style.Failure,
      title: "Erro de Conexão com Anki",
      message,
    });
  }

  static handleAIError(error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const message = "Erro ao gerar flashcards com IA";
    Logger.error(`${message}: ${errorMessage}`, error);

    // Determinar uma mensagem mais específica com base no erro
    let userMessage = "Não foi possível gerar flashcards. ";

    if (errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("connection")) {
      userMessage += "Problema de conexão com a internet. Verifique sua conexão e tente novamente.";
    } else if (errorMessage.includes("quota") || errorMessage.includes("limit") || errorMessage.includes("rate")) {
      userMessage += "Limite de requisições atingido. Tente novamente mais tarde.";
    } else if (
      errorMessage.includes("authentication") ||
      errorMessage.includes("auth") ||
      errorMessage.includes("key")
    ) {
      userMessage += "Problema de autenticação com a API. Verifique suas credenciais.";
    } else if (errorMessage.includes("parse") || errorMessage.includes("JSON")) {
      userMessage += "Problema ao processar a resposta da IA. Tente com um texto diferente ou menor.";
    } else {
      userMessage += "Tente novamente com um texto diferente ou menor.";
    }

    showToast({
      style: Toast.Style.Failure,
      title: "Erro na Geração de Flashcards",
      message: userMessage,
    });
  }
}
