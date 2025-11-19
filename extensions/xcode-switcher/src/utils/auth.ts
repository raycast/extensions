import { LocalStorage } from "@raycast/api";
import { execSync } from "child_process";

const PASSWORD_KEY = "sudo_password";

export async function getSavedPassword(): Promise<string | undefined> {
  console.log("[AUTH] Retrieving saved password from LocalStorage");
  const password = await LocalStorage.getItem<string>(PASSWORD_KEY);
  console.log(`[AUTH] Password ${password ? "found" : "not found"} in storage`);
  return password;
}

export async function savePassword(password: string): Promise<void> {
  console.log("[AUTH] Saving password to LocalStorage");
  await LocalStorage.setItem(PASSWORD_KEY, password);
  console.log("[AUTH] Password saved successfully");
}

export async function clearPassword(): Promise<void> {
  console.log("[AUTH] Clearing saved password");
  await LocalStorage.removeItem(PASSWORD_KEY);
  console.log("[AUTH] Password cleared");
}

export function validatePassword(password: string): boolean {
  console.log("[AUTH] Validating password with sudo test");
  try {
    // Testa a senha executando um comando sudo simples
    // Usa /usr/bin/true que é um comando que sempre retorna sucesso
    const command = `/bin/echo "${password}" | /usr/bin/sudo -S /usr/bin/true`;
    console.log("[AUTH] Executing validation command");

    const result = execSync(command, {
      encoding: "utf-8",
      shell: "/bin/bash",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"], // Captura stderr também
    });

    console.log("[AUTH] Password validation successful");
    if (result) {
      console.log("[AUTH] Output:", result.trim());
    }
    return true;
  } catch (error: any) {
    console.error("[AUTH] Password validation failed:", error.message);
    console.error("[AUTH] Exit code:", error.status);

    if (error.stdout) {
      console.log("[AUTH] Validation stdout:", error.stdout);
    }
    if (error.stderr) {
      console.error("[AUTH] Validation stderr:", error.stderr);
    }

    // Verifica se o erro é realmente de senha incorreta
    // Se o stderr contém "Sorry" ou o exit code é 1, a senha está incorreta
    if (
      error.stderr &&
      (error.stderr.includes("Sorry") ||
        error.stderr.includes("incorrect password"))
    ) {
      console.log("[AUTH] Password is incorrect");
      return false;
    }

    // Se o comando foi executado mas deu algum outro erro, ainda assim
    // pode ser que a senha esteja correta. Vamos checar o exit code.
    // Exit code 0 = sucesso, mesmo que tenha warnings
    if (error.status === 0) {
      console.log("[AUTH] Command succeeded despite error (exit code 0)");
      return true;
    }

    return false;
  }
}

export async function executeWithSudo(
  command: string,
  password?: string,
): Promise<string> {
  console.log("[AUTH] Executing command with sudo:", command.substring(0, 100));

  // Tenta usar a senha fornecida ou a salva
  const pwd = password || (await getSavedPassword());

  if (!pwd) {
    console.error("[AUTH] No password available for sudo execution");
    throw new Error("Password required for this operation");
  }

  console.log("[AUTH] Password available, executing command");

  try {
    // Usa caminhos completos para echo e sudo
    const fullCommand = `/bin/echo "${pwd}" | /usr/bin/sudo -S ${command}`;
    console.log("[AUTH] Executing with full paths");

    const result = execSync(fullCommand, {
      encoding: "utf-8",
      shell: "/bin/bash",
      timeout: 60000,
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH}`,
      },
    });

    console.log("[AUTH] Command executed successfully");
    console.log("[AUTH] Output length:", result.length);
    if (result.length > 0) {
      console.log("[AUTH] Output preview:", result.substring(0, 200));
    }
    return result;
  } catch (error: any) {
    console.error("[AUTH] Command execution failed:", error.message);
    console.error("[AUTH] Exit code:", error.status);

    if (error.stdout) {
      console.log("[AUTH] stdout:", error.stdout.substring(0, 200));
    }
    if (error.stderr) {
      console.error("[AUTH] stderr:", error.stderr.substring(0, 200));
    }

    // Se falhou por senha incorreta, limpa a senha salva
    if (
      error.stderr &&
      (error.stderr.includes("Sorry, try again") ||
        error.stderr.includes("incorrect password") ||
        error.stderr.includes("Sorry"))
    ) {
      console.log("[AUTH] Invalid password detected, clearing saved password");
      await clearPassword();
      throw new Error("Invalid password. Please try again.");
    }

    // Se deu erro mas o comando pode ter sido executado com sucesso
    // (alguns comandos retornam exit code diferente de 0 mas funcionam)
    if (error.stdout && error.stdout.length > 0) {
      console.log(
        "[AUTH] Command returned output despite error, may have succeeded",
      );
      return error.stdout;
    }

    throw error;
  }
}
