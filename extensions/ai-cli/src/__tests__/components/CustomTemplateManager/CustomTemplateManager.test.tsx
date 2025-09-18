import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useNavigation } from "@raycast/api";
import CustomTemplateManager from "@/components/CustomTemplateManager/CustomTemplateManager";
import { CustomTemplate, useCustomTemplates } from "@/hooks/useCustomTemplates";
import * as confirmation from "@/utils/confirmation";
import { createMockCustomTemplate } from "@/__tests__/test-utils";

// Mock dependencies
vi.mock("@/hooks/useCustomTemplates");
vi.mock("@/utils/confirmation");

// Mock child components for behavior testing
vi.mock("@/components/shared/CreateEntityAction", () => ({
  default: ({ title, onAction }: any) => (
    <button data-testid="create-entity-action" onClick={onAction}>
      {title}
    </button>
  ),
}));

vi.mock("@/components/CustomTemplateManager/components/TemplateListItem", () => ({
  TemplateListItem: ({ template, onEdit, onDelete }: any) => (
    <div data-testid="template-list-item">
      <span data-testid="template-name">{template.name}</span>
      <button data-testid="edit-template" onClick={() => onEdit(template)}>
        Edit
      </button>
      <button data-testid="delete-template" onClick={() => onDelete(template)}>
        Delete
      </button>
    </div>
  ),
}));

describe("when user manages custom templates", () => {
  const mockPush = vi.fn();
  const mockPop = vi.fn();
  const mockAddTemplate = vi.fn();
  const mockUpdateTemplate = vi.fn();
  const mockDeleteTemplate = vi.fn();

  const sampleTemplates: CustomTemplate[] = [
    createMockCustomTemplate({
      id: "template-1",
      name: "Slack Template",
      sections: { instructions: "Template for Slack messages" },
    }),
    createMockCustomTemplate({
      id: "template-2",
      name: "GitHub PR Template",
      sections: { instructions: "Template for GitHub pull requests" },
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useNavigation).mockReturnValue({
      push: mockPush,
      pop: mockPop,
    });

    vi.mocked(useCustomTemplates).mockReturnValue({
      templates: sampleTemplates,
      allTemplates: sampleTemplates,
      isLoading: false,
      addTemplate: mockAddTemplate,
      updateTemplate: mockUpdateTemplate,
      deleteTemplate: mockDeleteTemplate,
      getTemplateById: vi.fn(),
      refreshTemplates: vi.fn(),
    });

    vi.mocked(confirmation.confirmDeletion).mockResolvedValue(true);
    vi.mocked(confirmation.executeDeleteOperation).mockImplementation(
      async (_itemType: any, _itemName: any, deleteOperation: any) => {
        await deleteOperation();
      }
    );

    mockAddTemplate.mockResolvedValue(createMockCustomTemplate({ id: "new-template", name: "Test Template" }));
    mockUpdateTemplate.mockResolvedValue(createMockCustomTemplate({ id: "template-1", name: "Updated Template" }));
  });

  describe("when viewing template list", () => {
    it("displays all existing templates", () => {
      render(<CustomTemplateManager />);

      const templateItems = screen.getAllByTestId("template-list-item");
      expect(templateItems).toHaveLength(sampleTemplates.length);

      expect(screen.getByText("Slack Template")).toBeInTheDocument();
      expect(screen.getByText("GitHub PR Template")).toBeInTheDocument();
    });

    it("provides create new template option", async () => {
      const user = userEvent.setup();
      render(<CustomTemplateManager />);

      await user.click(screen.getByTestId("create-entity-action"));

      expect(mockPush).toHaveBeenCalled();
    });
  });

  describe("when searching templates", () => {
    it("allows user to filter templates by name", async () => {
      const user = userEvent.setup();
      render(<CustomTemplateManager />);

      const searchInput = screen.getByTestId("search-input");
      await user.type(searchInput, "Slack");

      expect(searchInput).toHaveValue("Slack");
    });
  });

  describe("when editing existing template", () => {
    it("opens template edit form with existing data", async () => {
      const user = userEvent.setup();
      render(<CustomTemplateManager />);

      const editButton = screen.getAllByTestId("edit-template")[0];
      await user.click(editButton);

      expect(mockPush).toHaveBeenCalled();
      const pushCall = mockPush.mock.calls[0][0];
      expect(pushCall.props.template).toEqual(sampleTemplates[0]);
    });
  });

  describe("when deleting template", () => {
    it("confirms deletion and removes template", async () => {
      const user = userEvent.setup();
      render(<CustomTemplateManager />);

      const deleteButton = screen.getAllByTestId("delete-template")[0];
      await user.click(deleteButton);

      await waitFor(() => {
        expect(confirmation.confirmDeletion).toHaveBeenCalledWith("Template", sampleTemplates[0].name);
        expect(confirmation.executeDeleteOperation).toHaveBeenCalled();
        expect(mockDeleteTemplate).toHaveBeenCalledWith(sampleTemplates[0].id);
      });
    });

    it("cancels deletion when user declines", async () => {
      const user = userEvent.setup();
      vi.mocked(confirmation.confirmDeletion).mockResolvedValue(false);

      render(<CustomTemplateManager />);

      const deleteButton = screen.getAllByTestId("delete-template")[0];
      await user.click(deleteButton);

      await waitFor(() => {
        expect(confirmation.confirmDeletion).toHaveBeenCalled();
        expect(mockDeleteTemplate).not.toHaveBeenCalled();
      });
    });
  });

  describe("when no templates exist", () => {
    beforeEach(() => {
      vi.mocked(useCustomTemplates).mockReturnValue({
        templates: [],
        allTemplates: [],
        isLoading: false,
        addTemplate: mockAddTemplate,
        updateTemplate: mockUpdateTemplate,
        deleteTemplate: mockDeleteTemplate,
        getTemplateById: vi.fn(),
        refreshTemplates: vi.fn(),
      });
    });

    it("shows empty state with guidance", () => {
      render(<CustomTemplateManager />);

      const emptyView = screen.getByTestId("list-empty-view");
      expect(emptyView).toBeInTheDocument();
    });

    it("provides option to create first template", () => {
      render(<CustomTemplateManager />);

      const createActions = screen.getAllByTestId("create-entity-action");
      expect(createActions.length).toBeGreaterThan(0);
    });
  });

  describe("when templates are loading", () => {
    it("shows loading state", () => {
      vi.mocked(useCustomTemplates).mockReturnValue({
        templates: [],
        allTemplates: [],
        isLoading: true,
        addTemplate: mockAddTemplate,
        updateTemplate: mockUpdateTemplate,
        deleteTemplate: mockDeleteTemplate,
        getTemplateById: vi.fn(),
        refreshTemplates: vi.fn(),
      });

      render(<CustomTemplateManager />);

      const list = screen.getByTestId("list");
      expect(list).toHaveAttribute("data-loading", "true");
    });
  });
});
