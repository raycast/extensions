// Mock implementation of @zed-industries/agent-client-protocol for testing

export const Client = jest.fn();
export const Transport = jest.fn();

export default {
  Client,
  Transport,
};