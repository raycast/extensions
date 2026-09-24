import { beforeEach, describe, expect, it, vi } from "vitest";
import { setMockPreferences } from "../../../__mocks__/@raycast/api";
import type { IndexedAttachment } from "@type/attachments";
import type { Workspace } from "@type/octarine";

const { getAttachments, useCachedPromise, useLoadingToast } = vi.hoisted(() => ({
  getAttachments: vi.fn(),
  useCachedPromise: vi.fn(),
  useLoadingToast: vi.fn(),
}));

vi.mock("@raycast/utils", () => ({ useCachedPromise }));
vi.mock("@commands/search-attachments/lib/attachments", () => ({ getAttachments }));
vi.mock("@commands/search-attachments/hooks/use-loading-toast", () => ({ useLoadingToast }));
vi.mock("react", () => ({ useMemo: (factory: () => unknown) => factory() }));

import { useAttachments } from "@commands/search-attachments/hooks/use-attachments";

const alpha: Workspace = { name: "Alpha", path: "/tmp/alpha" };
const beta: Workspace = { name: "Beta", path: "/tmp/beta" };

function attachment(workspace: Workspace, name: string, extension: string): IndexedAttachment {
  return {
    name,
    path: `${workspace.path}/${name}`,
    extension,
    workspace,
    searchText: `${name} ${workspace.name} ${extension}`.toLowerCase(),
  };
}

function renderAttachments(
  attachments: IndexedAttachment[],
  options?: Partial<Parameters<typeof useAttachments>[0]>,
  loading = false,
) {
  useCachedPromise.mockReturnValue({
    data: attachments,
    isLoading: loading,
    revalidate: vi.fn(),
  });

  return useAttachments({
    workspaces: [alpha, beta],
    excludedExtensions: new Set<string>(),
    searchText: "",
    selectedExtension: "all",
    ...options,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getAttachments.mockResolvedValue([]);
});

describe("useAttachments", () => {
  it("loads attachments with excluded sets in its cache key", async () => {
    setMockPreferences({ excludedFoldersInWorkspaces: "Templates, Archive" });
    const excludedExtensions = new Set(["png"]);
    const excludedDirectories = new Set(["archive", "templates"]);

    renderAttachments([], { excludedExtensions });
    const load = useCachedPromise.mock.calls[0][0];

    expect(useCachedPromise.mock.calls[0][1]).toEqual([false, [alpha, beta], excludedExtensions, excludedDirectories]);

    await load(false, [alpha, beta], excludedExtensions, excludedDirectories);

    expect(getAttachments).toHaveBeenCalledWith([alpha, beta], excludedExtensions, excludedDirectories, {
      refresh: false,
    });
  });

  it("builds a unique sorted extension dropdown", () => {
    const result = renderAttachments([
      attachment(alpha, "photo.jpg", "jpg"),
      attachment(alpha, "logo.png", "png"),
      attachment(beta, "other.png", "png"),
    ]);

    expect(result.dropdown).toEqual(["jpg", "png"]);
  });

  it("filters by the selected extension", () => {
    const result = renderAttachments([attachment(alpha, "logo.png", "png"), attachment(alpha, "photo.jpg", "jpg")], {
      selectedExtension: "png",
    });

    expect(result.sections[0].attachments.map((item) => item.name)).toEqual(["logo.png"]);
  });

  it("filters by search text", () => {
    const result = renderAttachments(
      [attachment(alpha, "report.pdf", "pdf"), attachment(alpha, "meeting-notes.md", "md")],
      { searchText: "report" },
    );

    expect(result.sections[0].attachments.map((item) => item.name)).toEqual(["report.pdf"]);
  });

  it("groups by workspace and sorts sections by name", () => {
    const result = renderAttachments([attachment(beta, "beta.png", "png"), attachment(alpha, "alpha.png", "png")]);

    expect(result.sections.map((section) => section.workspace.name)).toEqual(["Alpha", "Beta"]);
  });

  it("drops sections without matching attachments", () => {
    const result = renderAttachments([attachment(alpha, "logo.png", "png")], { selectedExtension: "jpg" });

    expect(result.sections).toEqual([]);
  });

  it("reports loading while disabled or while the scan is running", () => {
    expect(renderAttachments([], { enabled: false }).isLoading).toBe(true);
    expect(renderAttachments([], {}, true).isLoading).toBe(true);
    expect(renderAttachments([]).isLoading).toBe(false);
  });

  it("exposes the scan revalidate", () => {
    const revalidate = vi.fn();
    useCachedPromise.mockReturnValue({ data: [], isLoading: false, revalidate });

    const result = useAttachments({
      workspaces: [alpha, beta],
      excludedExtensions: new Set<string>(),
      searchText: "",
      selectedExtension: "all",
    });

    expect(result.revalidate).toBe(revalidate);
  });

  it("suppresses the scan toast while refreshing", () => {
    renderAttachments([], {}, true);
    expect(useLoadingToast).toHaveBeenCalledWith(expect.objectContaining({ isLoading: true }));

    renderAttachments([], { refresh: true }, true);
    expect(useLoadingToast).toHaveBeenLastCalledWith(expect.objectContaining({ isLoading: false }));
  });
});
