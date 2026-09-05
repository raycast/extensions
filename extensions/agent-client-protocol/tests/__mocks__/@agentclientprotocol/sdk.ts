// Mock implementation of @agentclientprotocol/sdk for testing

export const Client = jest.fn();
export const Transport = jest.fn();

export default {
  Client,
  Transport,
};