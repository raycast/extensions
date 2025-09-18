import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TemplateForm from "@/components/TemplateForm/TemplateForm";
import ResultsList from "@/components/ResultsList/ResultsList";
import { createMockFormValues, renderWithProviders } from "../test-utils";

const measureRenderTime = (renderFn: () => any) => {
  const start = performance.now();
  const result = renderFn();
  const end = performance.now();
  return { result, renderTime: end - start };
};

describe("Performance Tests", () => {
  beforeEach(() => {
    // Reset mocks between tests
    vi.clearAllMocks();
  });

  describe("Basic Rendering Performance", () => {
    it("should render TemplateForm efficiently", () => {
      const { renderTime } = measureRenderTime(() => renderWithProviders(<TemplateForm onSubmit={vi.fn()} />));

      expect(renderTime).toBeLessThan(500); // More realistic expectation for CI environments
      expect(screen.getByTestId("form")).toBeInTheDocument();
    });

    it("should render ResultsList with multiple variants", () => {
      const { renderTime } = measureRenderTime(() =>
        renderWithProviders(
          <ResultsList templateName="Slack" formValues={createMockFormValues()} inputText="Original text" />
        )
      );

      expect(renderTime).toBeLessThan(200);
      expect(screen.getByRole("list")).toBeInTheDocument();
    });

    it("should handle form re-renders efficiently", () => {
      const { rerender } = renderWithProviders(<TemplateForm onSubmit={vi.fn()} />);

      const { renderTime } = measureRenderTime(() => rerender(<TemplateForm onSubmit={vi.fn()} />));

      expect(renderTime).toBeLessThan(50);
    });
  });

  describe("Component Cleanup", () => {
    it("should unmount without errors", () => {
      const { unmount } = renderWithProviders(<TemplateForm onSubmit={vi.fn()} />);
      expect(() => unmount()).not.toThrow();
    });

    it("should handle multiple mount/unmount cycles", () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderWithProviders(<TemplateForm onSubmit={vi.fn()} />);
        expect(() => unmount()).not.toThrow();
      }
    });
  });
});
