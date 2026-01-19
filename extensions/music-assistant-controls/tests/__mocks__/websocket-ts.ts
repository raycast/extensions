export const WebsocketBuilder = jest.fn().mockImplementation(() => ({
  url: jest.fn().mockReturnThis(),
  onOpen: jest.fn().mockReturnThis(),
  onClose: jest.fn().mockReturnThis(),
  onError: jest.fn().mockReturnThis(),
  onMessage: jest.fn().mockReturnThis(),
  onRetry: jest.fn().mockReturnThis(),
  withBackoff: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({
    send: jest.fn(),
    close: jest.fn(),
  }),
}));

export const Websocket = jest.fn();
export const LinearBackoff = jest.fn();
