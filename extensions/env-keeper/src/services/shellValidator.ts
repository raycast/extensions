import { exec } from "node:child_process";

/** 只支持能做 `<shell> -n` 语法检查的两种 shell;探测不出具体是哪种(如 fish)时不做校验 */
export type ValidatableShell = "zsh" | "bash";

/**
 * 用真实探测到的 shell 类型做语法校验(`zsh -n` 或 `bash -n`)。
 * 传 undefined(探测不出具体 shell,如 fish)时直接跳过校验、不阻断保存——
 * 校验用的是用户实际的登录 shell,而不是写死 zsh:zsh/bash 语法并不完全通用
 * (例如 zsh 的 `repeat n do ... done` 循环,bash -n 会直接语法报错)。
 */
export async function validateShellSyntax(
  scriptContent: string,
  shellKind: ValidatableShell | undefined,
): Promise<{ valid: boolean; error?: string }> {
  if (!scriptContent || scriptContent.trim() === "") {
    return { valid: true };
  }
  if (!shellKind) {
    return { valid: true };
  }

  try {
    // 通过 stdin 将内容喂给 `<shell> -n`;shellKind 只可能是 "zsh"/"bash" 字面量,非用户输入,拼接安全
    const child = exec(`${shellKind} -n`);
    // 存成局部常量:直接用 child.stdin 的话,类型收窄进不了下面的 Promise 闭包
    const stdin = child.stdin;
    if (!stdin) {
      return { valid: true };
    }

    return await new Promise<{ valid: boolean; error?: string }>((resolve) => {
      let stderr = "";
      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve({ valid: true });
        } else {
          resolve({ valid: false, error: stderr.trim() || `${shellKind} syntax error (exit code ${code})` });
        }
      });

      child.on("error", (err) => {
        // 如果系统没有该 shell 或执行异常,不阻断保存
        resolve({ valid: true, error: err.message });
      });

      stdin.write(scriptContent);
      stdin.end();
    });
  } catch {
    return { valid: true };
  }
}

/**
 * 这个词是不是一条真实存在的命令。给拼写提醒兜底:`make PREFIX=/usr install` 这种"命令 变量=值 参数"
 * 是合法且常见的写法,以前会被说成"不像是一条命令"。
 * 用登录 shell 的 `-l` 模式查:Raycast 进程的 PATH 很短,brew 装的命令直接查会查不到。
 * 词只允许安全字符,拼进命令行没有注入风险;查不出来(超时、shell 不在)按"不认识"处理,照常提醒
 */
export async function isKnownCommand(word: string, shellKind: ValidatableShell | undefined): Promise<boolean> {
  if (!/^[A-Za-z0-9_.+-]+$/.test(word)) return false;
  const shell = shellKind ?? "zsh";
  return new Promise((resolve) => {
    const child = exec(`${shell} -lc 'command -v -- ${word}'`, { timeout: 3000 }, (error) => resolve(!error));
    child.on("error", () => resolve(false));
  });
}
