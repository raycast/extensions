import { showToast, getPreferenceValues } from "@raycast/api";
import { writeFile, readFile } from "fs/promises";
import Command from "../add-todo";

jest.mock("fs/promises");

describe("AddTodo Command", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPreferenceValues as jest.Mock).mockReturnValue({
      logseqPath: "/test/path",
      defaultPage: "todos",
    });
  });

  it("should add todo to existing page", async () => {
    const mockContent = "# todos\n\n";
    (readFile as jest.Mock).mockResolvedValue(mockContent);
    (writeFile as jest.Mock).mockResolvedValue(undefined);

    const values = {
      content: "Test todo",
      page: "todos",
    };

    const command = new Command();
    await command.handleSubmit(values);

    expect(writeFile).toHaveBeenCalledWith("/test/path/pages/todos.md", mockContent + "- [ ] Test todo\n", "utf-8");
    expect(showToast).toHaveBeenCalled();
  });

  it("should create new page if not exists", async () => {
    (readFile as jest.Mock).mockRejectedValue(new Error("File not found"));
    (writeFile as jest.Mock).mockResolvedValue(undefined);

    const values = {
      content: "Test todo",
      page: "new-page",
    };

    const command = new Command();
    await command.handleSubmit(values);

    expect(writeFile).toHaveBeenCalledWith("/test/path/pages/new-page.md", "# new-page\n\n- [ ] Test todo\n", "utf-8");
    expect(showToast).toHaveBeenCalled();
  });
});
