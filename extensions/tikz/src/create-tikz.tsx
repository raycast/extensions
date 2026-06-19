import { Action, ActionPanel, Form, showToast, Toast, open, trash } from "@raycast/api";
import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { useState } from "react";
import { homedir } from "os";

// Find pdflatex in common locations
function findPdflatex(): string {
  const commonPaths = [
    "/Library/TeX/texbin/pdflatex",
    "/usr/local/texlive/2025basic/bin/universal-darwin/pdflatex",
    "/usr/local/texlive/2024/bin/universal-darwin/pdflatex",
    "/usr/local/bin/pdflatex",
    "/opt/homebrew/bin/pdflatex",
  ];

  for (const path of commonPaths) {
    try {
      execSync(`test -x "${path}"`, { stdio: "ignore" });
      return path;
    } catch {
      continue;
    }
  }

  // Fallback to PATH
  try {
    const result = execSync("which pdflatex", { encoding: "utf-8", stdio: "pipe" });
    return result.trim();
  } catch {
    throw new Error("pdflatex not found. Please install MacTeX or BasicTeX.");
  }
}

interface TikZFormValues {
  tikzCode: string;
  fileName: string;
  openAfter: boolean;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: TikZFormValues) {
    if (!values.tikzCode.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "TikZ code is required",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create output directory
      const outputDir = join(homedir(), "Documents", "TikZ-Diagrams");
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Generate filename
      const timestamp = Date.now();
      const baseName =
        values.fileName
          ?.trim()
          .replace(/[^a-z0-9]/gi, "_")
          .substring(0, 100) || "diagram";
      const texFileName = `${baseName}_${timestamp}.tex`;
      const pdfFileName = `${baseName}_${timestamp}.pdf`;
      const pngFileName = `${baseName}_${timestamp}.png`;
      const texFilePath = join(outputDir, texFileName);
      const pdfFilePath = join(outputDir, pdfFileName);
      const pngFilePath = join(outputDir, pngFileName);

      // Clean TikZ code - strip out document structure if user included it
      let cleanTikzCode = values.tikzCode.trim();

      // Remove document class, packages, and document environment if present
      cleanTikzCode = cleanTikzCode
        .replace(/\\documentclass(\[.*?\])?\{.*?\}/g, "")
        .replace(/\\usepackage(\[.*?\])?\{.*?\}/g, "")
        .replace(/\\begin\{document\}/g, "")
        .replace(/\\end\{document\}/g, "")
        .replace(/\\begin\{tikzpicture\}/g, "")
        .replace(/\\end\{tikzpicture\}/g, "")
        .trim();

      // Create complete LaTeX document
      const latexDocument = `\\documentclass[border=10pt]{standalone}
\\usepackage{xcolor}
\\usepackage{tikz}
\\usetikzlibrary{arrows,automata,positioning,shapes,calc,decorations.pathreplacing,decorations.markings,patterns}
\\pagecolor{white}

\\begin{document}
\\begin{tikzpicture}
${cleanTikzCode}
\\end{tikzpicture}
\\end{document}`;

      // Write LaTeX file
      writeFileSync(texFilePath, latexDocument);

      // Show compilation toast
      await showToast({
        style: Toast.Style.Animated,
        title: "Compiling TikZ diagram...",
      });

      // Compile to PDF
      try {
        // Find pdflatex and set proper environment
        const pdflatexPath = findPdflatex();
        execSync(`"${pdflatexPath}" -interaction=nonstopmode -output-directory="${outputDir}" "${texFilePath}"`, {
          cwd: outputDir,
          encoding: "utf-8",
          env: {
            ...process.env,
            PATH: `/Library/TeX/texbin:/usr/local/texlive/2025basic/bin/universal-darwin:${process.env.PATH}`,
          },
        });
      } catch {
        // Check if PDF was still created despite error
        if (!existsSync(pdfFilePath)) {
          // Try to read the log file for more details
          const logFilePath = join(outputDir, `${baseName}_${timestamp}.log`);
          let errorDetails = "";
          try {
            const logContent = readFileSync(logFilePath, "utf-8");

            // Extract relevant error lines
            const errorLines = logContent
              .split("\n")
              .filter((line: string) => line.includes("!") || line.includes("Error") || line.includes("undefined"))
              .slice(0, 5)
              .join("\n");

            if (errorLines) {
              errorDetails = `\n\nError details:\n${errorLines}`;
            }
          } catch {
            // Log file not available
          }

          throw new Error(
            "Failed to compile TikZ diagram. Make sure pdflatex is installed with the 'standalone' package.\n\n" +
              "Try installing it with: tlmgr install standalone" +
              errorDetails,
          );
        }
      }

      // Convert PDF to PNG for better compatibility
      let finalFilePath = pdfFilePath;
      let finalFileName = pdfFileName;

      try {
        execSync(`sips -s format png -Z 4096 "${pdfFilePath}" --out "${pngFilePath}"`, {
          encoding: "utf-8",
          stdio: "pipe",
        });

        if (existsSync(pngFilePath)) {
          finalFilePath = pngFilePath;
          finalFileName = pngFileName;

          // Clean up intermediate files
          try {
            const logFilePath = join(outputDir, `${baseName}_${timestamp}.log`);
            const auxFilePath = join(outputDir, `${baseName}_${timestamp}.aux`);

            if (existsSync(pdfFilePath)) await trash(pdfFilePath);
            if (existsSync(texFilePath)) await trash(texFilePath);
            if (existsSync(logFilePath)) await trash(logFilePath);
            if (existsSync(auxFilePath)) await trash(auxFilePath);
          } catch {
            // Ignore cleanup errors
          }
        }
      } catch {
        // If PNG conversion fails, fall back to PDF
        console.log("PNG conversion failed, using PDF");
      }

      // Success!
      await showToast({
        style: Toast.Style.Success,
        title: "TikZ diagram generated!",
        message: `Saved to ${finalFileName}`,
      });

      // Open the file if requested
      if (values.openAfter) {
        await open(finalFilePath);
      }

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate diagram",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate TikZ Diagram" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a TikZ diagram from LaTeX code. The diagram will be compiled to PNG." />

      <Form.TextArea
        id="tikzCode"
        title="TikZ Code"
        placeholder="Enter your TikZ code here..."
        info="Enter TikZ commands only, or paste a complete LaTeX document. The wrapper will be handled automatically."
      />

      <Form.TextField
        id="fileName"
        title="File Name"
        placeholder="my-diagram"
        info="Optional: Name for the output file (without extension)"
      />

      <Form.Checkbox id="openAfter" label="Open PNG after generation" defaultValue={true} />

      <Form.Description text="Example TikZ code:" />
      <Form.Description text="\draw (0,0) circle (1cm);\n\draw (0,0) -- (1,1);\n\node at (0,-1.5) {My Circle};" />
    </Form>
  );
}
