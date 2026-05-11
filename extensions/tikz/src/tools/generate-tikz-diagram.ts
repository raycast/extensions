import { environment, showToast, Toast, trash } from "@raycast/api";
import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";

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

type Input = {
  /**
   * The TikZ code to compile into a diagram
   */
  tikzCode: string;
  /**
   * Optional title/name for the diagram file
   */
  fileName?: string;
};

export default async function (input: Input): Promise<string> {
  try {
    // Create output directory if it doesn't exist
    const outputDir = join(environment.supportPath, "tikz-diagrams");
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const baseName = input.fileName?.replace(/[^a-z0-9]/gi, "_").substring(0, 100) || "diagram";
    const texFileName = `${baseName}_${timestamp}.tex`;
    const pdfFileName = `${baseName}_${timestamp}.pdf`;
    const pngFileName = `${baseName}_${timestamp}.png`;
    const texFilePath = join(outputDir, texFileName);
    const pdfFilePath = join(outputDir, pdfFileName);
    const pngFilePath = join(outputDir, pngFileName);

    // Clean TikZ code - strip out document structure if user included it
    let cleanTikzCode = input.tikzCode.trim();

    // Remove document class, packages, and document environment if present
    cleanTikzCode = cleanTikzCode
      .replace(/\\documentclass(\[.*?\])?\{.*?\}/g, "")
      .replace(/\\usepackage(\[.*?\])?\{.*?\}/g, "")
      .replace(/\\begin\{document\}/g, "")
      .replace(/\\end\{document\}/g, "")
      .replace(/\\begin\{tikzpicture\}/g, "")
      .replace(/\\end\{tikzpicture\}/g, "")
      .trim();

    // Create complete LaTeX document with TikZ code
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

    // Show toast that compilation is starting
    await showToast({
      style: Toast.Style.Animated,
      title: "Compiling TikZ diagram...",
    });

    // Compile LaTeX to PDF using pdflatex
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
      // pdflatex might exit with non-zero status but still produce output
      // Check if PDF was created
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
          `Failed to compile TikZ diagram. Make sure pdflatex is installed with the 'standalone' package.\n\n` +
            `Try installing it with: tlmgr install standalone${errorDetails}`,
        );
      }
    }

    // Convert PDF to PNG for better compatibility with AI chat
    // Use higher resolution for crisp output
    try {
      // First, convert PDF to high-res PNG using sips with scaling
      // Get PDF dimensions and scale up for better quality (4096px for maximum clarity)
      execSync(`sips -s format png -Z 4096 "${pdfFilePath}" --out "${pngFilePath}"`, {
        encoding: "utf-8",
        stdio: "pipe",
      });

      if (existsSync(pngFilePath)) {
        // Clean up intermediate files (PDF, TEX, LOG, AUX)
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

        await showToast({
          style: Toast.Style.Success,
          title: "TikZ diagram generated!",
          message: pngFileName,
        });

        // Return the PNG path for better AI display
        return pngFilePath;
      }
    } catch (convertError) {
      // If PNG conversion fails, fall back to PDF
      console.log("PNG conversion failed, returning PDF:", convertError);
    }

    // Fallback: return PDF if PNG conversion failed
    await showToast({
      style: Toast.Style.Success,
      title: "TikZ diagram generated!",
      message: pdfFileName,
    });

    return pdfFilePath;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to generate TikZ diagram",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
