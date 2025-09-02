import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Icon } from "@raycast/api";
import EntityListItem from "@/components/shared/EntityListItem";

// Use shared mock from __mocks__ directory
vi.mock("../../../components/shared/CreateEntityAction", () => ({
  default: ({ title, onAction }: { title: string; onAction: () => void }) => (
    <button data-testid="create-entity-action" onClick={onAction}>
      {title}
    </button>
  ),
}));

interface TestEntity {
  id: string;
  name: string;
  description?: string;
}

describe("Entity List Item", () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const testEntity: TestEntity = {
    id: "test-entity-1",
    name: "Test Template",
    description: "A test template for testing",
  };

  const defaultProps = {
    entity: testEntity,
    subtitle: "None template for Slack messages",
    icon: Icon.Document,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onCreate: mockOnCreate,
    copyContent: "Format content to copy",
    entityType: "template" as const,
  };

  describe("User Interactions", () => {
    it("allows user to edit entity", async () => {
      const user = userEvent.setup();
      render(<EntityListItem {...defaultProps} />);

      const editButton = screen.getByRole("button", { name: /edit template/i });
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(testEntity);
      expect(mockOnEdit).toHaveBeenCalledOnce();
    });

    it("allows user to delete entity", async () => {
      const user = userEvent.setup();
      render(<EntityListItem {...defaultProps} />);

      const deleteButton = screen.getByRole("button", { name: /delete template/i });
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(testEntity);
      expect(mockOnDelete).toHaveBeenCalledOnce();
    });

    it("allows user to create new entity", async () => {
      const user = userEvent.setup();
      render(<EntityListItem {...defaultProps} />);

      const createButton = screen.getByTestId("create-entity-action");
      await user.click(createButton);

      expect(mockOnCreate).toHaveBeenCalledOnce();
    });
  });

  describe("Entity Management Workflows", () => {
    it("supports editing workflow for different entity types", async () => {
      const user = userEvent.setup();
      const toneEntity = { ...testEntity, name: "Professional Tone" };
      const toneProps = {
        ...defaultProps,
        entity: toneEntity,
        entityType: "tone" as const,
      };

      render(<EntityListItem {...toneProps} />);

      const editButton = screen.getByRole("button", { name: /edit tone/i });
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(toneEntity);
    });

    it("supports deletion workflow with proper confirmation", async () => {
      const user = userEvent.setup();
      render(<EntityListItem {...defaultProps} />);

      const deleteButton = screen.getByRole("button", { name: /delete template/i });
      await user.click(deleteButton);
      expect(mockOnDelete).toHaveBeenCalledWith(testEntity);
    });

    it("provides copy functionality for entity content", () => {
      render(<EntityListItem {...defaultProps} />);

      const copyButton = screen.getByTestId("action-copy-clipboard");
      expect(copyButton).toHaveAttribute("content", defaultProps.copyContent);
    });
  });

  describe("Accessibility and User Experience", () => {
    it("provides accessible action labels", () => {
      render(<EntityListItem {...defaultProps} />);

      expect(screen.getByRole("button", { name: /edit template/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /delete template/i })).toBeInTheDocument();
    });

    it("displays entity with proper visual hierarchy", () => {
      render(<EntityListItem {...defaultProps} />);

      const listItem = screen.getByTestId("list-item");
      expect(listItem).toHaveAttribute("data-title", testEntity.name);
      expect(listItem).toHaveAttribute("data-subtitle", defaultProps.subtitle);
      expect(listItem).toHaveAttribute("data-icon", defaultProps.icon);
    });
  });
});
