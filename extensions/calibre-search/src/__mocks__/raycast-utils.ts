export const useSQL = jest.fn(() => ({
  data: [],
  isLoading: false,
  permissionView: null,
  revalidate: jest.fn(),
}));
