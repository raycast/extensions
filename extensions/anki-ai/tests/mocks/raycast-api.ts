// Mock para a API do Raycast
export const showToast = jest.fn();
export const AI = {
  ask: jest.fn(),
};

export const Toast = {
  Style: {
    Animated: "animated",
    Failure: "failure",
    Success: "success",
  },
};

// Mocks para outros componentes da API que possam ser necessários
export const getPreferenceValues = jest.fn(() => ({}));
