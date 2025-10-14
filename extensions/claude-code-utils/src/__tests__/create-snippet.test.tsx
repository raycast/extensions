/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CreateSnippet, {
  CreateSnippetProps,
} from "../commands/create-snippet/list";
import { createSnippet, type Snippet } from "../utils/claude-message";
import * as RaycastAPI from "@raycast/api";
import { LaunchType } from "@raycast/api";

interface MockFormProps {
  children: React.ReactNode;
  isLoading: boolean;
  actions: React.ReactNode;
}

interface MockFormFieldProps {
  id: string;
  title: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

interface MockActionPanelProps {
  children: React.ReactNode;
}

interface MockSubmitFormProps {
  title: string;
  onSubmit: () => void;
}

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  Form: Object.assign(
    ({ children, isLoading, actions }: MockFormProps) => (
      <form data-testid="form" data-loading={isLoading}>
        {children}
        {actions}
      </form>
    ),
    {
      TextField: ({
        id,
        title,
        placeholder,
        value,
        onChange,
      }: MockFormFieldProps) => (
        <input
          data-testid={`form-textfield-${id}`}
          data-title={title}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ),
      TextArea: ({
        id,
        title,
        placeholder,
        value,
        onChange,
      }: MockFormFieldProps) => (
        <textarea
          data-testid={`form-textarea-${id}`}
          data-title={title}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ),
    },
  ),
  ActionPanel: ({ children }: MockActionPanelProps) => (
    <div data-testid="action-panel">{children}</div>
  ),
  Action: {
    SubmitForm: ({ title, onSubmit }: MockSubmitFormProps) => (
      <button
        data-testid="action-submit-form"
        data-title={title}
        onClick={onSubmit}
        type="submit"
      >
        {title}
      </button>
    ),
  },
  showToast: jest.fn(),
  Toast: {
    Style: {
      Success: "success",
      Failure: "failure",
      Animated: "animated",
    },
  },
  launchCommand: jest.fn(),
  LaunchType: {
    UserInitiated: "userInitiated",
    Background: "background",
  },
  LaunchProps: {},
}));

// Mock the createSnippet utility function
jest.mock("../utils/claude-message", () => ({
  createSnippet: jest.fn(),
}));

const mockCreateSnippet = createSnippet as jest.MockedFunction<
  typeof createSnippet
>;
const mockShowToast = RaycastAPI.showToast as jest.MockedFunction<
  typeof RaycastAPI.showToast
>;
const mockLaunchCommand = RaycastAPI.launchCommand as jest.MockedFunction<
  typeof RaycastAPI.launchCommand
>;

describe("CreateSnippet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks before each test
    mockCreateSnippet.mockReset();
    mockShowToast.mockReset();
    mockLaunchCommand.mockReset();
  });

  describe("Component Rendering", () => {
    it("should render the form with all necessary elements", () => {
      render(<CreateSnippet />);

      // Check if form is rendered
      expect(screen.getByTestId("form")).toBeInTheDocument();

      // Check if title field is rendered
      const titleField = screen.getByTestId("form-textfield-title");
      expect(titleField).toBeInTheDocument();
      expect(titleField).toHaveAttribute("data-title", "Title (Optional)");
      expect(titleField).toHaveAttribute(
        "placeholder",
        "Enter snippet title...",
      );

      // Check if content field is rendered
      const contentField = screen.getByTestId("form-textarea-content");
      expect(contentField).toBeInTheDocument();
      expect(contentField).toHaveAttribute("data-title", "Content");
      expect(contentField).toHaveAttribute(
        "placeholder",
        "Enter snippet content...",
      );

      // Check if action panel is rendered
      expect(screen.getByTestId("action-panel")).toBeInTheDocument();

      // Check if submit button is rendered
      const submitButton = screen.getByTestId("action-submit-form");
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute("data-title", "Create Snippet");
    });

    it("should render with initial loading state as false", () => {
      render(<CreateSnippet />);

      const form = screen.getByTestId("form");
      expect(form).toHaveAttribute("data-loading", "false");
    });

    it("should render with empty initial values when no props provided", () => {
      render(<CreateSnippet />);

      const titleField = screen.getByTestId("form-textfield-title");
      const contentField = screen.getByTestId("form-textarea-content");

      expect(titleField).toHaveValue("");
      expect(contentField).toHaveValue("");
    });
  });

  describe("Props Handling", () => {
    it("should initialize with direct props", () => {
      const props: CreateSnippetProps = {
        title: "Test Title",
        content: "Test Content",
      };

      render(<CreateSnippet {...props} />);

      const titleField = screen.getByTestId("form-textfield-title");
      const contentField = screen.getByTestId("form-textarea-content");

      expect(titleField).toHaveValue("Test Title");
      expect(contentField).toHaveValue("Test Content");
    });

    it("should initialize with LaunchProps format", () => {
      const launchProps = {
        launchType: LaunchType.UserInitiated,
        arguments: {},
        launchContext: {
          title: "Launch Title",
          content: "Launch Content",
        },
      };

      render(<CreateSnippet {...launchProps} />);

      const titleField = screen.getByTestId("form-textfield-title");
      const contentField = screen.getByTestId("form-textarea-content");

      expect(titleField).toHaveValue("Launch Title");
      expect(contentField).toHaveValue("Launch Content");
    });

    it("should handle missing launchContext gracefully", () => {
      const launchProps = {};

      render(<CreateSnippet {...launchProps} />);

      const titleField = screen.getByTestId("form-textfield-title");
      const contentField = screen.getByTestId("form-textarea-content");

      expect(titleField).toHaveValue("");
      expect(contentField).toHaveValue("");
    });

    it("should handle partial props", () => {
      const props: CreateSnippetProps = {
        content: "Only Content",
      };

      render(<CreateSnippet {...props} />);

      const titleField = screen.getByTestId("form-textfield-title");
      const contentField = screen.getByTestId("form-textarea-content");

      expect(titleField).toHaveValue("");
      expect(contentField).toHaveValue("Only Content");
    });
  });

  describe("Form Interactions", () => {
    it("should update title field when typing", () => {
      render(<CreateSnippet />);

      const titleField = screen.getByTestId("form-textfield-title");

      fireEvent.change(titleField, { target: { value: "New Title" } });

      expect(titleField).toHaveValue("New Title");
    });

    it("should update content field when typing", () => {
      render(<CreateSnippet />);

      const contentField = screen.getByTestId("form-textarea-content");

      fireEvent.change(contentField, { target: { value: "New Content" } });

      expect(contentField).toHaveValue("New Content");
    });

    it("should handle multiple input changes", () => {
      render(<CreateSnippet />);

      const titleField = screen.getByTestId("form-textfield-title");
      const contentField = screen.getByTestId("form-textarea-content");

      fireEvent.change(titleField, { target: { value: "Title 1" } });
      fireEvent.change(contentField, { target: { value: "Content 1" } });
      fireEvent.change(titleField, { target: { value: "Title 2" } });
      fireEvent.change(contentField, { target: { value: "Content 2" } });

      expect(titleField).toHaveValue("Title 2");
      expect(contentField).toHaveValue("Content 2");
    });
  });

  describe("Form Validation", () => {
    it("should show error toast when content is empty", async () => {
      render(<CreateSnippet />);

      const submitButton = screen.getByTestId("action-submit-form");

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          style: "failure",
          title: "Content is required",
          message: "Please enter content for your snippet",
        });
      });

      expect(mockCreateSnippet).not.toHaveBeenCalled();
      expect(mockLaunchCommand).not.toHaveBeenCalled();
    });

    it("should show error toast when content is only whitespace", async () => {
      render(<CreateSnippet />);

      const contentField = screen.getByTestId("form-textarea-content");
      const submitButton = screen.getByTestId("action-submit-form");

      fireEvent.change(contentField, { target: { value: "   \n\t  " } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          style: "failure",
          title: "Content is required",
          message: "Please enter content for your snippet",
        });
      });

      expect(mockCreateSnippet).not.toHaveBeenCalled();
    });

    it("should allow submission with valid content and empty title", async () => {
      mockCreateSnippet.mockResolvedValueOnce({
        id: "test-id",
        title: "",
        content: "Valid content",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      render(<CreateSnippet />);

      const contentField = screen.getByTestId("form-textarea-content");
      const submitButton = screen.getByTestId("action-submit-form");

      fireEvent.change(contentField, { target: { value: "Valid content" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateSnippet).toHaveBeenCalledWith("", "Valid content");
      });
    });
  });

  describe("Form Submission - Success Cases", () => {
    it("should create snippet with title and content", async () => {
      const mockSnippet = {
        id: "test-id",
        title: "Test Title",
        content: "Test Content",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateSnippet.mockResolvedValueOnce(mockSnippet);

      render(<CreateSnippet />);

      const titleField = screen.getByTestId("form-textfield-title");
      const contentField = screen.getByTestId("form-textarea-content");
      const submitButton = screen.getByTestId("action-submit-form");

      fireEvent.change(titleField, { target: { value: "Test Title" } });
      fireEvent.change(contentField, { target: { value: "Test Content" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateSnippet).toHaveBeenCalledWith(
          "Test Title",
          "Test Content",
        );
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "success",
        title: "Snippet created",
        message: '"Test Title" has been saved',
      });

      expect(mockLaunchCommand).toHaveBeenCalledWith({
        name: "browse-snippets",
        type: "userInitiated",
      });
    });

    it("should create snippet with only content (no title)", async () => {
      const mockSnippet = {
        id: "test-id",
        title: "",
        content: "Content only",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateSnippet.mockResolvedValueOnce(mockSnippet);

      render(<CreateSnippet />);

      const contentField = screen.getByTestId("form-textarea-content");
      const submitButton = screen.getByTestId("action-submit-form");

      fireEvent.change(contentField, { target: { value: "Content only" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateSnippet).toHaveBeenCalledWith("", "Content only");
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "success",
        title: "Snippet created",
        message: "Snippet has been saved",
      });

      expect(mockLaunchCommand).toHaveBeenCalledWith({
        name: "browse-snippets",
        type: "userInitiated",
      });
    });

    it("should trim whitespace from title and content", async () => {
      const mockSnippet = {
        id: "test-id",
        title: "Trimmed Title",
        content: "Trimmed Content",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateSnippet.mockResolvedValueOnce(mockSnippet);

      render(<CreateSnippet />);

      const titleField = screen.getByTestId("form-textfield-title");
      const contentField = screen.getByTestId("form-textarea-content");
      const submitButton = screen.getByTestId("action-submit-form");

      fireEvent.change(titleField, { target: { value: "  Trimmed Title  " } });
      fireEvent.change(contentField, {
        target: { value: "  Trimmed Content  " },
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateSnippet).toHaveBeenCalledWith(
          "Trimmed Title",
          "Trimmed Content",
        );
      });
    });

    it("should show loading state during submission", async () => {
      let resolvePromise: (value: Snippet) => void;
      const promise = new Promise<Snippet>((resolve) => {
        resolvePromise = resolve;
      });

      mockCreateSnippet.mockReturnValueOnce(promise);

      render(<CreateSnippet />);

      const contentField = screen.getByTestId("form-textarea-content");
      const submitButton = screen.getByTestId("action-submit-form");
      const form = screen.getByTestId("form");

      fireEvent.change(contentField, { target: { value: "Test content" } });
      fireEvent.click(submitButton);

      // Should be loading
      expect(form).toHaveAttribute("data-loading", "true");

      // Resolve the promise
      resolvePromise!({
        id: "test-id",
        title: "",
        content: "Test content",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await waitFor(() => {
        expect(form).toHaveAttribute("data-loading", "false");
      });
    });
  });

  describe("Form Submission - Error Cases", () => {
    it("should handle createSnippet error", async () => {
      const errorMessage = "Network error";
      mockCreateSnippet.mockRejectedValueOnce(new Error(errorMessage));

      render(<CreateSnippet />);

      const contentField = screen.getByTestId("form-textarea-content");
      const submitButton = screen.getByTestId("action-submit-form");

      fireEvent.change(contentField, { target: { value: "Test content" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          style: "failure",
          title: "Failed to create snippet",
          message: `Error: ${errorMessage}`,
        });
      });

      expect(mockLaunchCommand).not.toHaveBeenCalled();
    });

    it("should handle non-Error exceptions", async () => {
      const errorMessage = "String error";
      mockCreateSnippet.mockRejectedValueOnce(errorMessage);

      render(<CreateSnippet />);

      const contentField = screen.getByTestId("form-textarea-content");
      const submitButton = screen.getByTestId("action-submit-form");

      fireEvent.change(contentField, { target: { value: "Test content" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          style: "failure",
          title: "Failed to create snippet",
          message: errorMessage,
        });
      });
    });

    it("should reset loading state after error", async () => {
      mockCreateSnippet.mockRejectedValueOnce(new Error("Test error"));

      render(<CreateSnippet />);

      const contentField = screen.getByTestId("form-textarea-content");
      const submitButton = screen.getByTestId("action-submit-form");
      const form = screen.getByTestId("form");

      fireEvent.change(contentField, { target: { value: "Test content" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(form).toHaveAttribute("data-loading", "false");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid successive submissions", async () => {
      mockCreateSnippet.mockResolvedValue({
        id: "test-id",
        title: "",
        content: "Test content",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      render(<CreateSnippet />);

      const contentField = screen.getByTestId("form-textarea-content");
      const submitButton = screen.getByTestId("action-submit-form");

      fireEvent.change(contentField, { target: { value: "Test content" } });

      // Click multiple times rapidly - the current implementation will call createSnippet for each click
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      // Wait for all async operations to complete
      await waitFor(() => {
        // The current implementation doesn't prevent multiple submissions
        // Each click will trigger handleSubmit, so we expect 3 calls
        expect(mockCreateSnippet).toHaveBeenCalledTimes(3);
      });
    });

    it("should handle special characters in title and content", async () => {
      const specialTitle = "Test 🎉 & <script>alert('xss')</script> Title";
      const specialContent =
        "Content with émojis 🚀 and spéciàl chars: @#$%^&*()";

      mockCreateSnippet.mockResolvedValueOnce({
        id: "test-id",
        title: specialTitle,
        content: specialContent,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      render(<CreateSnippet />);

      const titleField = screen.getByTestId("form-textfield-title");
      const contentField = screen.getByTestId("form-textarea-content");
      const submitButton = screen.getByTestId("action-submit-form");

      fireEvent.change(titleField, { target: { value: specialTitle } });
      fireEvent.change(contentField, { target: { value: specialContent } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateSnippet).toHaveBeenCalledWith(
          specialTitle,
          specialContent,
        );
      });
    });

    it("should handle very long content", async () => {
      const longContent = "a".repeat(10000);

      mockCreateSnippet.mockResolvedValueOnce({
        id: "test-id",
        title: "",
        content: longContent,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      render(<CreateSnippet />);

      const contentField = screen.getByTestId("form-textarea-content");
      const submitButton = screen.getByTestId("action-submit-form");

      fireEvent.change(contentField, { target: { value: longContent } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateSnippet).toHaveBeenCalledWith("", longContent);
      });
    });

    it("should handle newlines and multiline content", async () => {
      const multilineContent = "Line 1\nLine 2\n\nLine 4\tTabbed content";

      mockCreateSnippet.mockResolvedValueOnce({
        id: "test-id",
        title: "",
        content: multilineContent,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      render(<CreateSnippet />);

      const contentField = screen.getByTestId("form-textarea-content");
      const submitButton = screen.getByTestId("action-submit-form");

      fireEvent.change(contentField, { target: { value: multilineContent } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateSnippet).toHaveBeenCalledWith("", multilineContent);
      });
    });
  });

  describe("Success Message Variations", () => {
    it("should show titled snippet message when title is provided", async () => {
      mockCreateSnippet.mockResolvedValueOnce({
        id: "test-id",
        title: "My Snippet",
        content: "Test content",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      render(<CreateSnippet />);

      const titleField = screen.getByTestId("form-textfield-title");
      const contentField = screen.getByTestId("form-textarea-content");
      const submitButton = screen.getByTestId("action-submit-form");

      fireEvent.change(titleField, { target: { value: "My Snippet" } });
      fireEvent.change(contentField, { target: { value: "Test content" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          style: "success",
          title: "Snippet created",
          message: '"My Snippet" has been saved',
        });
      });
    });

    it("should show generic snippet message when title is whitespace", async () => {
      mockCreateSnippet.mockResolvedValueOnce({
        id: "test-id",
        title: "",
        content: "Test content",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      render(<CreateSnippet />);

      const titleField = screen.getByTestId("form-textfield-title");
      const contentField = screen.getByTestId("form-textarea-content");
      const submitButton = screen.getByTestId("action-submit-form");

      fireEvent.change(titleField, { target: { value: "   " } });
      fireEvent.change(contentField, { target: { value: "Test content" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          style: "success",
          title: "Snippet created",
          message: "Snippet has been saved",
        });
      });
    });
  });
});
