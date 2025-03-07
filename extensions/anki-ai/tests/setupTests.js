// Arquivo para corrigir o problema com testing-library/react-hooks
// Como estamos usando o React Hooks para testes, precisamos configurar
// o adaptador do ambiente de teste para lidar com os hooks corretamente.

// Configuração do fetch-mock para testes que envolvem requisições HTTP
require('jest-fetch-mock').enableMocks();

// Silenciar logs durante os testes
global.console = {
  ...console,
  // Manter os logs de erro para depuração, mas silenciar os outros durante os testes
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Manter console.error para depuração
  // error: jest.fn(),
};

// Mock para o localStorage
class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }
}

global.localStorage = new LocalStorageMock();

// Configurar timeout mais longo para testes que envolvem operações assíncronas
jest.setTimeout(10000);
