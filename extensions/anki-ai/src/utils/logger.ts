export class Logger {
  static readonly LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  // Nível atual de log, por padrão mostra INFO e acima
  private static currentLogLevel = Logger.LOG_LEVELS.INFO;

  // Flag para modo de depuração
  private static debugMode = false;

  /**
   * Define o nível de log atual
   */
  static setLogLevel(level: number) {
    if (level >= 0 && level <= 3) {
      this.currentLogLevel = level;
    }
  }

  /**
   * Ativa ou desativa o modo de depuração
   * Quando ativado, define o nível de log para DEBUG
   */
  static setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
    if (enabled) {
      this.setLogLevel(Logger.LOG_LEVELS.DEBUG);
    } else {
      this.setLogLevel(Logger.LOG_LEVELS.INFO);
    }
  }

  /**
   * Verifica se o modo de depuração está ativado
   */
  static isDebugMode(): boolean {
    return this.debugMode;
  }

  /**
   * Log de depuração com detalhes adicionais
   */
  static debug(message: string, data?: unknown) {
    if (this.currentLogLevel <= Logger.LOG_LEVELS.DEBUG) {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] [DEBUG] ${message}`, data !== undefined ? data : "");
    }
  }

  /**
   * Log informativo para acompanhamento normal de operações
   */
  static info(message: string, data?: unknown) {
    if (this.currentLogLevel <= Logger.LOG_LEVELS.INFO) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [INFO] ${message}`, data !== undefined ? data : "");
    }
  }

  /**
   * Log de aviso para situações importantes mas não críticas
   */
  static warn(message: string, data?: unknown) {
    if (this.currentLogLevel <= Logger.LOG_LEVELS.WARN) {
      const timestamp = new Date().toISOString();
      console.warn(`[${timestamp}] [WARN] ${message}`, data !== undefined ? data : "");
    }
  }

  /**
   * Log de erro para situações problemáticas que requerem atenção
   */
  static error(message: string, data?: unknown) {
    if (this.currentLogLevel <= Logger.LOG_LEVELS.ERROR) {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] [ERROR] ${message}`, data !== undefined ? data : "");
    }
  }

  /**
   * Log específico para requisições do Anki para facilitar diagnóstico
   */
  static ankiRequest(action: string, params: Record<string, unknown>, response?: unknown) {
    if (this.currentLogLevel <= Logger.LOG_LEVELS.DEBUG) {
      const timestamp = new Date().toISOString();
      if (response) {
        console.debug(`[${timestamp}] [ANKI] ${action} - Resposta:`, response);
      } else {
        console.debug(`[${timestamp}] [ANKI] ${action} - Parâmetros:`, params);
      }
    }
  }

  /**
   * Log específico para operações de IA para facilitar diagnóstico
   */
  static aiOperation(operation: string, details?: unknown) {
    if (this.currentLogLevel <= Logger.LOG_LEVELS.DEBUG) {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] [AI] ${operation}`, details !== undefined ? details : "");
    }
  }

  /**
   * Log específico para preferências do usuário
   */
  static preferences(preferences: Record<string, unknown>) {
    if (this.currentLogLevel <= Logger.LOG_LEVELS.DEBUG) {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] [PREFS] Preferências carregadas:`, preferences);
    }
  }
}
