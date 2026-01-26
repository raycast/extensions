/**
 * Mock Raycast API for testing
 */

const mockGetPreferenceValues = () => ({
  apiKey: process.env.DEX_API_KEY || "test-api-key",
});

export const getPreferenceValues = mockGetPreferenceValues;

export const showToast = jest.fn();

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
  },
};

export const Icon = {
  Person: "person",
  Envelope: "envelope",
  Phone: "phone",
  Message: "message",
  TwoPersons: "two-persons",
  Bird: "bird",
  Camera: "camera",
  Globe: "globe",
  Link: "link",
  Pencil: "pencil",
  Trash: "trash",
  Eye: "eye",
  Clock: "clock",
  Plus: "plus",
};

export const Color = {
  Blue: "blue",
  Green: "green",
  Red: "red",
};

export const ActionPanel = jest.fn();
export const Action = jest.fn();
export const List = jest.fn();
export const Detail = jest.fn();
export const Form = jest.fn();
export const useNavigation = jest.fn(() => ({
  pop: jest.fn(),
  push: jest.fn(),
}));
