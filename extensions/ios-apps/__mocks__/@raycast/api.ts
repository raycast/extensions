// Mock implementation of @raycast/api for testing

export const getPreferenceValues = jest.fn(() => ({
  includeIPhone: true,
  includeIPad: true,
  includeMac: false,
  includeAppleTV: false,
  includeAppleWatch: false,
  includeVisionPro: false,
  includeIMessage: false,
  verboseLogging: false,
}));

export const showToast = jest.fn();

export const Toast = {
  Style: {
    Success: 'success',
    Failure: 'failure',
    Animated: 'animated',
  },
};

export const environment = {
  supportPath: '/tmp/test-support',
  assetsPath: '/tmp/test-assets',
};
