import fetchMock from "jest-fetch-mock";

// Configurar o fetch mock para testes
fetchMock.enableMocks();

// Desabilitar logs durante os testes a menos que explicitamente habilitados
jest.mock("../src/utils/logger", () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    // Permitir habilitar logs reais durante testes específicos
    enableTestLogs: function () {
      this.debug.mockImplementation(console.debug);
      this.info.mockImplementation(console.info);
      this.warn.mockImplementation(console.warn);
      this.error.mockImplementation(console.error);
      this.log.mockImplementation(console.log);
    },
    // Restaurar mocks
    resetTestLogs: function () {
      this.debug.mockReset();
      this.info.mockReset();
      this.warn.mockReset();
      this.error.mockReset();
      this.log.mockReset();
    },
  },
}));
