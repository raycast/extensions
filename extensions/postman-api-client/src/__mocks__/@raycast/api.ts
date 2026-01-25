export const getPreferenceValues = jest.fn(() => ({
  accessToken: "test-token",
}))

export const LocalStorage = {
  Values: {},
}

export const showToast = jest.fn()
export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
  },
}
