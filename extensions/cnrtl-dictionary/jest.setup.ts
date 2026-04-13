import fetchMock from "jest-fetch-mock";

fetchMock.enableMocks();

// Reset all mocks between tests
beforeEach(() => {
  fetchMock.resetMocks();
});
