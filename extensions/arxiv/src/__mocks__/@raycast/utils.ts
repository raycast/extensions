export const useCachedPromise = jest.fn(() => {
  return {
    data: undefined,
    error: undefined,
    isLoading: true,
    revalidate: jest.fn(),
  };
});

export const useCachedState = jest.fn((_key, initialValue) => {
  return [initialValue, jest.fn()];
});

export const showFailureToast = jest.fn(() => Promise.resolve());
