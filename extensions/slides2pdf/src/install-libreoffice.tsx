import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { exec, execFileSync } from "child_process";

interface Todo {
  id: string;
  title: string;
  subtitle?: string;
  isCompleted: boolean;
}

function defaultItems(): Todo[] {
  return [
    { id: "1", title: "Install Homebrew", isCompleted: false },
    { id: "2", title: "Install LibreOffice", isCompleted: false },
    { id: "3", title: "Convert your first Slides to PDF!", isCompleted: false },
  ];
}

function findBrew(): string {
  try {
    const out = execFileSync("/bin/zsh", ["-lc", "command -v brew"], {
      encoding: "utf8",
      timeout: 1000,
    }).trim();
    if (out) {
      showToast({ title: `Found brew at ${out}`, style: Toast.Style.Success });
      return out;
    }
  } catch {
    // ignore
  }

  return "";
}

function findLibreOfficePath(): string | null {
  try {
    const out = execFileSync("/bin/zsh", ["-lc", "command -v soffice"], {
      encoding: "utf8",
      timeout: 1000,
    }).trim();
    if (out) {
      showToast({ title: `Found LibreOffice at ${out}`, style: Toast.Style.Success });
      return out;
    }
  } catch {
    // ignore
  }

  return "";
}

async function goToBrew() {
  exec("open https://brew.sh");
}

export default function Command() {
  const [items, setItems] = useCachedState<Todo[]>("todos", defaultItems());

  // inital checks
  useEffect(() => {
    (async () => {
      const brewPath = await findBrew();
      if (brewPath) {
        setItems((prev) =>
          prev.map((t) => (t.id === "1" ? { ...t, isCompleted: true, subtitle: `Found Homebrew at ${brewPath}` } : t)),
        );
        const libreOfficePath = await findLibreOfficePath();
        if (libreOfficePath) {
          setItems((prev) =>
            prev.map((t) =>
              t.id === "2" ? { ...t, isCompleted: true, subtitle: `Found LibreOffice at ${libreOfficePath}` } : t,
            ),
          );
        }
      }
    })();
  }, []);

  async function toggle(id: string) {
    if (id === "1") {
      if (!items.find((t) => t.id === "1")?.isCompleted) {
        goToBrew();
      } else {
        showToast({ title: "Homebrew already installed", style: Toast.Style.Success });
      }
      return;
    }
    // default toggle for manual tasks
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)));
  }

  return (
    <List>
      {items.map((todo) => (
        <List.Item
          key={todo.id}
          title={todo.title}
          subtitle={todo.subtitle}
          accessories={[{ icon: todo.isCompleted ? Icon.Checkmark : Icon.Circle }]}
          actions={
            <ActionPanel>
              <Action
                icon={todo.isCompleted ? Icon.Circle : Icon.Checkmark}
                title={todo.isCompleted ? "" : todo.title}
                onAction={() => toggle(todo.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
