import { execAsync } from "./exec";

// 명령어 경로를 캐시
const commandPaths: Record<string, string | null> = {};

/**
 * 시스템에서 명령어의 전체 경로를 찾습니다.
 * @param command 찾을 명령어 이름
 * @returns 명령어의 전체 경로 또는 null
 */
export async function findCommand(command: string): Promise<string | null> {
  // 캐시 확인
  if (commandPaths[command] !== undefined) {
    return commandPaths[command];
  }

  // 1. which 명령어로 시도
  try {
    const { stdout } = await execAsync(`which ${command}`);
    const path = stdout.trim();
    if (path) {
      commandPaths[command] = path;
      return path;
    }
  } catch {
    // which 실패 시 다른 방법 시도
  }

  // 2. 일반적인 경로들 시도
  const commonPaths = [
    `/usr/bin/${command}`,
    `/bin/${command}`,
    `/usr/sbin/${command}`,
    `/sbin/${command}`,
    `/usr/local/bin/${command}`,
    `/opt/homebrew/bin/${command}`, // Apple Silicon Homebrew
    `/usr/local/opt/${command}/bin/${command}`, // Intel Homebrew
  ];

  for (const path of commonPaths) {
    try {
      // 파일이 존재하고 실행 가능한지 확인
      await execAsync(`test -x "${path}"`);
      commandPaths[command] = path;
      return path;
    } catch {
      // 다음 경로 시도
    }
  }

  // 명령어를 찾을 수 없음
  commandPaths[command] = null;
  return null;
}

/**
 * 명령어를 동적으로 찾아서 실행합니다.
 * @param command 실행할 명령어
 * @param args 명령어 인자 (파이프나 리다이렉션 포함 가능)
 * @returns 명령어 실행 결과
 */
export async function runCommand(command: string, args: string): Promise<{ stdout: string; stderr: string }> {
  const cmdPath = await findCommand(command);
  if (!cmdPath) {
    throw new Error(`Command not found: ${command}. Please check if it is installed.`);
  }
  return execAsync(`${cmdPath} ${args}`);
}

/**
 * 여러 명령어를 파이프로 연결하여 실행합니다.
 * @param pipeline 파이프라인 명령어 문자열
 * @returns 명령어 실행 결과
 */
export async function runPipeline(pipeline: string): Promise<{ stdout: string; stderr: string }> {
  // 파이프라인의 첫 번째 명령어만 경로 변환
  const match = pipeline.match(/^(\S+)(.*)$/);
  if (!match) {
    throw new Error("Invalid pipeline command");
  }

  const [, firstCommand, rest] = match;
  const cmdPath = await findCommand(firstCommand);
  if (!cmdPath) {
    throw new Error(`Command not found: ${firstCommand}. Please check if it is installed.`);
  }

  return execAsync(`${cmdPath}${rest}`);
}

/**
 * 캐시를 초기화합니다.
 */
export function clearCommandCache(): void {
  Object.keys(commandPaths).forEach((key) => delete commandPaths[key]);
}
