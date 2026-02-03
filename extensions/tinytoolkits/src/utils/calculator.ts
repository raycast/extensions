// 1. 先定义 CalculationResult 类型并导出，供调用处使用
// export type CalculationResult = {
//   success: boolean;
//   original: string;
//   hex: string;
//   int: string;
//   error: unknown | null;
// };
import { environment } from "@raycast/api";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

interface CalculationResult {
  success: boolean;
  original: string;
  hex: string;
  int: string;
  error?: string | null;
}

// 2. 抽离核心计算函数并导出，移除组件内的 setResult（状态操作留在组件中）
export const calcTs = async (expression: string): Promise<CalculationResult | null> => {
  // 内部辅助函数（无需导出，仅当前文件使用）
  const calculateResults = (input: string): CalculationResult | null => {
    if (!input.trim()) return null;

    try {
      const result = new Function(`return ${input}`)();

      if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
        return null;
      }

      // 准备输出结果
      const raw = result.toString();
      const intVal = Math.trunc(result); // 截断小数转整数
      const intStr = intVal.toString();

      // 转十六进制（无符号 32 位）
      const hexStr = "0x" + (intVal >>> 0).toString(16).toUpperCase();

      // 修正：原代码 hex 和 int 字段赋值颠倒，此处已更正
      return {
        success: true,
        original: raw,
        int: intStr, // 整数结果
        hex: hexStr, // 十六进制结果
        error: null,
      };
    } catch (error) {
      // 处理错误：将 unknown 类型的 error 转为 string，符合 interface 要求
      const errorMsg = error instanceof Error ? error.message : "未知计算错误";
      return {
        success: false,
        original: "Error",
        hex: "Error",
        int: "Error",
        error: errorMsg,
      };
    }
  };

  const calcResult = await Promise.resolve(calculateResults(expression));
  return calcResult;
};

// 2. 抽离核心计算函数并导出，移除组件内的 setResult（状态操作留在组件中）
export const calcPy = async (expression: string): Promise<CalculationResult | null> => {
  // 获取 Python 脚本路径（兼容 Windows 和 macOS/Linux）
  const calculateResults = async (expression: string): Promise<CalculationResult | null> => {
    function getScriptPath(): string {
      // 方法1: 尝试使用 __dirname (打包后的路径)
      let scriptPath = path.join(__dirname, "calculator.py");

      if (!fs.existsSync(scriptPath)) {
        scriptPath = path.join(environment.assetsPath, "calculator.py");
      }

      if (!fs.existsSync(scriptPath)) {
        const extensionRoot = path.join(environment.assetsPath, "..");
        scriptPath = path.join(extensionRoot, "src", "utils", "calculator.py");
      }

      return scriptPath;
    }

    function getPythonPath(): string {
      // 方法1: 尝试使用 python3 (macOS/Linux)
      let pythonPath = "python3";

      // 方法2: 尝试使用 python (Windows)
      if (process.platform === "win32") {
        pythonPath = "python";
      }

      return pythonPath;
    }

    const scriptPath = getScriptPath();
    const pythonPath = getPythonPath();
    // 检查文件是否存在
    if (!fs.existsSync(scriptPath)) {
      throw new Error(
        `Python script not found at: ${scriptPath}\n\nPlease ensure calculator.py is in the src/ directory.`,
      );
    }

    // 转义表达式中的特殊字符和引号
    const escapedExpression = expression
      .replace(/\\/g, "\\\\") // 转义反斜杠
      .replace(/"/g, '\\"'); // 转义双引号

    const command: string = `${pythonPath} "${scriptPath}" "${escapedExpression}"`;

    // 执行 Python 脚本
    const { stdout, stderr } = await execAsync(command, {
      timeout: 5000,
      maxBuffer: 1024 * 1024,
    });

    if (stderr && !stdout) {
      throw new Error(stderr);
    }

    // 解析 JSON 输出
    const jsonResult: CalculationResult = JSON.parse(stdout.trim());
    return jsonResult;
  };

  const calcResult = await Promise.resolve(calculateResults(expression));
  return calcResult;
};
