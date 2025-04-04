jest.mock('@raycast/api', () => ({
  showToast: jest.fn(),
  Toast: {
    Style: {
      Success: 'success',
      Failure: 'failure',
    },
  },
  getPreferenceValues: jest.fn(),
  Form: {
    TextField: jest.fn(),
  },
  ActionPanel: jest.fn(),
  Action: {
    SubmitForm: jest.fn(),
  },
  List: {
    Item: jest.fn(),
  },
}));