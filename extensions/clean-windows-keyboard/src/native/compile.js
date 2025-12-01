const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

if (process.platform !== "win32") {
  console.log("⚠️  Not running on Windows. Skipping C# compilation.");
  process.exit(0);
}

// We need to find csc.exe (C# Compiler)
// It is usually located in C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe (x64)
// or C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe (x86)

const possiblePaths = [
  "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe",
  "C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe",
];

let cscPath = null;

for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    cscPath = p;
    break;
  }
}

if (!cscPath) {
  console.error("❌ Could not find c# compiler (csc.exe)");
  console.error(
    "Please ensure .NET Framework 4.x is installed (it usually is on Windows).",
  );
  process.exit(1);
}

const sourceFile = path.join(__dirname, "KeyboardBlocker.cs");
// Raycast extensions usually put assets in an 'assets' folder in the root or similar.
// For development, we can put it in 'assets' folder in the project root.
const assetsDir = path.join(__dirname, "..", "..", "assets");
const outputFile = path.join(assetsDir, "KeyboardBlocker.exe");

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

console.log(`🔨 Compiling ${sourceFile}...`);

try {
  // Compile command
  // /target:winexe -> Creates a Windows executable
  // /out:... -> Output path
  // /reference:... -> Explicitly reference Windows Forms
  const cmd = `"${cscPath}" /target:winexe /out:"${outputFile}" /reference:System.Windows.Forms.dll "${sourceFile}"`;
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
  console.log(`✅ Successfully compiled to ${outputFile}`);
} catch (error) {
  console.error("❌ Compilation failed:", error);
  process.exit(1);
}
