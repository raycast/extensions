import { Detail, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { runMole, getMolePathSafe } from "./utils/mole";
import { MoleNotInstalled } from "./components/MoleNotInstalled";

function parseVersion(output: string): string {
  const match = output.match(/Mole version ([\d.]+)/);
  return match ? match[1] : "unknown";
}

function UpdateView() {
  const [result, setResult] = useState<{ status: "loading" | "success" | "error"; message: string; version: string }>({
    status: "loading",
    message: "Checking for updates...",
    version: "",
  });

  useEffect(() => {
    let mounted = true;

    async function update() {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating Mole..." });
      try {
        const output = await runMole(["update"], { timeout: 60000 });
        const alreadyUpToDate = output.toLowerCase().includes("already");

        const versionOutput = await runMole(["--version"], { timeout: 10000 });
        const version = parseVersion(versionOutput);

        toast.style = Toast.Style.Success;
        toast.title = alreadyUpToDate ? "No updates available" : "Mole updated successfully";

        if (!mounted) return;

        setResult({
          status: "success",
          message: alreadyUpToDate ? "You're on the latest version." : "Mole has been updated.",
          version,
        });
      } catch (err) {
        await showFailureToast(err, { title: "Update failed" });
        if (!mounted) return;
        setResult({
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
          version: "",
        });
      }
    }

    update();

    return () => {
      mounted = false;
    };
  }, []);

  const markdown =
    result.status === "loading"
      ? "Checking for updates..."
      : result.status === "error"
        ? `## Update Failed\n\n\`${result.message}\``
        : `## ${result.message}\n\n**Version:** ${result.version}`;

  return <Detail isLoading={result.status === "loading"} markdown={markdown} />;
}

export default function UpdateMole() {
  const molePath = getMolePathSafe();

  if (!molePath) {
    return <MoleNotInstalled />;
  }

  return <UpdateView />;
}
