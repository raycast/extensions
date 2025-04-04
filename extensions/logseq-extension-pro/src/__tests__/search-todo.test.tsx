import { showToast, getPreferenceValues } from "@raycast/api";
import { readdir, readFile } from "fs/promises";
import Command from "../search-todo";

jest.mock("fs/promises");

describe("SearchTodo Command", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPreferenceValues as jest.Mock).mockReturnValue({
      logseqPath: "/test/path",
    });
  });

  it("should load todos from all pages", async () => {
    (readdir as jest.Mock).mockResolvedValue(["page1.md", "page2.md"]);
    (readFile as jest.Mock).mockImplementation((path) => {
      if (path === "/test/path/pages/page1.md") {
        return Promise.resolve("# Page1\n\n- [ ] Todo 1\n- [x] Todo 2\n");
      }
      return Promise.resolve("# Page2\n\n- [ ] Todo 3\n");
    });

    const command = new Command();
    await command.loadTodos();

    expect(command.todos).toEqual([
      { content: "Todo 1", page: "page1", completed: false },
      { content: "Todo 2", page: "page1", completed: true },
      { content: "Todo 3", page: "page2", completed: false },
    ]);
  });

  it("should handle errors when loading todos", async () => {
    (readdir as jest.Mock).mockRejectedValue(new Error("Failed to read directory"));

    const command = new Command();
    await command.loadTodos();

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        title: "Failed to load Todo",
      }),
    );
  });
});
