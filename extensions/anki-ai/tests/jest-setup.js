// jest-setup.js
// Esta configuração é carregada antes dos testes

// Mock do React
jest.mock('react', () => require('./mocks/react').default);

// Configurar adaptadores e mocks globais
jest.mock("@raycast/api", () => ({
  showToast: jest.fn(),
  Toast: {
    Style: {
      Animated: "animated",
      Failure: "failure",
      Success: "success",
    },
  },
}));

// Silenciar logs durante os testes
jest.mock('../src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    ankiRequest: jest.fn(),
    setLogLevel: jest.fn(),
    LOG_LEVELS: {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
    }
  }
}));
