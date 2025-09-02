import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useNavigation } from "@raycast/api";
import CustomToneManager from "@/components/CustomToneManager/CustomToneManager";
import { CustomTone, useCustomTones } from "@/hooks/useCustomTones";
import * as confirmation from "@/utils/confirmation";

// Mock dependencies
vi.mock("@/hooks/useCustomTones");
vi.mock("@/utils/confirmation");

// Mock child components for behavior testing
vi.mock("@/components/shared/CreateEntityAction", () => ({
  default: ({ title, onAction }: any) => (
    <button data-testid="create-entity-action" onClick={onAction}>
      {title}
    </button>
  ),
}));

vi.mock("@/components/CustomToneManager/components/ToneListItem", () => ({
  default: ({ tone, onEdit, onDelete }: any) => (
    <div data-testid="tone-list-item">
      <span data-testid="tone-name">{tone.name}</span>
      <button data-testid="edit-tone" onClick={() => onEdit(tone)}>
        Edit
      </button>
      <button data-testid="delete-tone" onClick={() => onDelete(tone)}>
        Delete
      </button>
    </div>
  ),
}));

describe("when user manages custom tones", () => {
  const mockPush = vi.fn();
  const mockPop = vi.fn();
  const mockAddTone = vi.fn();
  const mockUpdateTone = vi.fn();
  const mockDeleteTone = vi.fn();

  const sampleTones: CustomTone[] = [
    {
      id: "tone-1",
      name: "Professional",
      guidelines: "Use formal language and proper structure",
      icon: "https://example.com/professional.png",
      isBuiltIn: false,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "tone-2",
      name: "Friendly",
      guidelines: "Use casual and welcoming tone",
      icon: "https://example.com/friendly.png",
      isBuiltIn: false,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useNavigation).mockReturnValue({
      push: mockPush,
      pop: mockPop,
    });

    vi.mocked(useCustomTones).mockReturnValue({
      tones: sampleTones,
      allTones: sampleTones,
      isLoading: false,
      addTone: mockAddTone,
      updateTone: mockUpdateTone,
      deleteTone: mockDeleteTone,
      getToneById: vi.fn(),
      refreshTones: vi.fn(),
    });

    vi.mocked(confirmation.confirmDeletion).mockResolvedValue(true);
    vi.mocked(confirmation.executeDeleteOperation).mockImplementation(
      async (_itemType: any, _itemName: any, deleteOperation: any) => {
        await deleteOperation();
      }
    );

    mockAddTone.mockResolvedValue({ id: "new-tone", name: "Test Tone", guidelines: "Test guidelines" });
    mockUpdateTone.mockResolvedValue({ id: "tone-1", name: "Updated Tone", guidelines: "Updated guidelines" });
  });

  describe("when viewing tone list", () => {
    it("displays all existing tones", () => {
      render(<CustomToneManager />);

      const toneItems = screen.getAllByTestId("tone-list-item");
      expect(toneItems).toHaveLength(sampleTones.length);

      expect(screen.getByText("Professional")).toBeInTheDocument();
      expect(screen.getByText("Friendly")).toBeInTheDocument();
    });

    it("provides create new tone option", async () => {
      const user = userEvent.setup();
      render(<CustomToneManager />);

      await user.click(screen.getByTestId("create-entity-action"));

      expect(mockPush).toHaveBeenCalled();
    });
  });

  describe("when searching tones", () => {
    it("allows user to filter tones by name", async () => {
      const user = userEvent.setup();
      render(<CustomToneManager />);

      const searchInput = screen.getByTestId("search-input");
      await user.type(searchInput, "Professional");

      expect(searchInput).toHaveValue("Professional");
    });
  });

  describe("when editing existing tone", () => {
    it("opens tone edit form with existing data", async () => {
      const user = userEvent.setup();
      render(<CustomToneManager />);

      const editButton = screen.getAllByTestId("edit-tone")[0];
      await user.click(editButton);

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({
            tone: sampleTones[0],
            onUpdate: mockUpdateTone,
          }),
        })
      );
    });
  });

  describe("when deleting tone", () => {
    it("confirms deletion and removes tone", async () => {
      const user = userEvent.setup();
      render(<CustomToneManager />);

      const deleteButton = screen.getAllByTestId("delete-tone")[0];
      await user.click(deleteButton);

      await waitFor(() => {
        expect(confirmation.confirmDeletion).toHaveBeenCalledWith("Tone", sampleTones[0].name);
        expect(confirmation.executeDeleteOperation).toHaveBeenCalled();
        expect(mockDeleteTone).toHaveBeenCalledWith(sampleTones[0].id);
      });
    });

    it("cancels deletion when user declines", async () => {
      const user = userEvent.setup();
      vi.mocked(confirmation.confirmDeletion).mockResolvedValue(false);

      render(<CustomToneManager />);

      const deleteButton = screen.getAllByTestId("delete-tone")[0];
      await user.click(deleteButton);

      await waitFor(() => {
        expect(confirmation.confirmDeletion).toHaveBeenCalled();
        expect(mockDeleteTone).not.toHaveBeenCalled();
      });
    });
  });

  describe("when no tones exist", () => {
    beforeEach(() => {
      vi.mocked(useCustomTones).mockReturnValue({
        tones: [],
        allTones: [],
        isLoading: false,
        addTone: mockAddTone,
        updateTone: mockUpdateTone,
        deleteTone: mockDeleteTone,
        getToneById: vi.fn(),
        refreshTones: vi.fn(),
      });
    });

    it("shows empty state with guidance", () => {
      render(<CustomToneManager />);

      const emptyView = screen.getByTestId("list-empty-view");
      expect(emptyView).toBeInTheDocument();
    });

    it("provides option to create first tone", () => {
      render(<CustomToneManager />);

      const createActions = screen.getAllByTestId("create-entity-action");
      expect(createActions.length).toBeGreaterThan(0);
    });
  });

  describe("when tones are loading", () => {
    it("shows loading state", () => {
      vi.mocked(useCustomTones).mockReturnValue({
        tones: [],
        allTones: [],
        isLoading: true,
        addTone: mockAddTone,
        updateTone: mockUpdateTone,
        deleteTone: mockDeleteTone,
        getToneById: vi.fn(),
        refreshTones: vi.fn(),
      });

      render(<CustomToneManager />);

      const list = screen.getByTestId("list");
      expect(list).toHaveAttribute("data-loading", "true");
    });
  });
});
