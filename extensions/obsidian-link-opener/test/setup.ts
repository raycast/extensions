import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import mockFs from "mock-fs";

// Extend Vitest's expect with testing-library matchers
expect.extend(matchers as any);

// Reset mocks and clean up after each test
afterEach(() => {
  cleanup();
  mockFs.restore();
  vi.resetAllMocks();
});


// Mock fs-extra
vi.mock("fs-extra", () => {
  return {
    readFile: vi.fn(),
    stat: vi.fn(),
    pathExists: vi.fn(),
    readJson: vi.fn(),
  };
});

// Mock open
vi.mock("open", () => {
  return {
    default: vi.fn(),
  };
});

// Mock gray-matter
vi.mock("gray-matter", () => {
  return {
    default: vi.fn((content) => ({
      data: {},
      content,
    })),
  };
});

// Mock glob
vi.mock("glob", () => {
  return {
    glob: vi.fn().mockResolvedValue([]),
  };
});

// Mock @raycast/api
vi.mock("@raycast/api", () => {
  return {
    getPreferenceValues: vi.fn(),
    showToast: vi.fn().mockResolvedValue(undefined),
    open: vi.fn().mockResolvedValue(undefined),
    Toast: {
      Style: {
        Success: "success",
        Failure: "failure",
      },
    },
    Action: {
      SubmitForm: vi.fn().mockImplementation(({ title, onSubmit }) => ({
        title,
        onSubmit,
      })),
    },
    ActionPanel: vi.fn().mockImplementation(({ children }) => ({
      children,
    })),
    Form: vi.fn().mockImplementation(({ children, actions }) => ({
      children,
      actions,
      TextField: vi.fn().mockImplementation(({ id, value, onChange, onBlur, error }) => ({
        id,
        value,
        onChange,
        onBlur,
        error,
      })),
      Description: vi.fn().mockImplementation(({ text }) => ({
        text,
      })),
    })),
    Detail: vi.fn().mockImplementation(({ markdown, isLoading, actions }) => ({
      markdown,
      isLoading,
      actions,
    })),
  };
});
