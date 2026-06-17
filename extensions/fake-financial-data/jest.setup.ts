jest.mock(
  "@raycast/api",
  () => ({
    showToast: jest.fn(),
    Clipboard: {
      copy: jest.fn(),
    },
    showHUD: jest.fn(),
  })
);

export {}