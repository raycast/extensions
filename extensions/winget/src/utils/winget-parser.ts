/**
 * Winget output parser
 * Parses table-formatted output from winget commands
 * Supports both English and Russian localization
 */

export interface WingetPackage {
  name: string;
  id: string;
  version: string;
  availableVersion?: string;
  source?: string;
}

export interface ParseResult {
  packages: WingetPackage[];
  error?: string;
  debug?: DebugInfo;
}

export interface DebugInfo {
  rawOutput: string;
  cleanedLines: string[];
  headerLineIndex: number;
  headerLine: string | null;
  separatorIndex: number;
  positions: ColumnPosition | null;
  dataStartLine: number;
  parseErrors: string[];
}

interface ColumnPosition {
  name: number;
  id: number;
  version: number;
  available?: number;
  source?: number;
}

// Заголовки на разных языках
const NAME_HEADERS = ["Name", "Имя", "Nombre", "名前", "名称"];
const ID_HEADERS = ["Id", "ИД", "Identificador", "ID"];
const VERSION_HEADERS = ["Version", "Версия", "Versión", "バージョン", "版本"];
const AVAILABLE_HEADERS = ["Available", "Доступно", "Disponible", "利用可能", "可用"];
const SOURCE_HEADERS = ["Source", "Источник", "Origen", "ソース", "源"];

// Глобальный флаг дебага
let DEBUG_ENABLED = false;

export function enableDebug(enabled: boolean) {
  DEBUG_ENABLED = enabled;
}

function debugLog(...args: unknown[]) {
  if (DEBUG_ENABLED) {
    console.log("[winget-parser]", ...args);
  }
}

/**
 * Очищает весь вывод winget от мусора
 * Winget выводит прогресс-бары и спиннеры через \r (carriage return)
 * Нужно разбить по \r и взять только последние валидные строки
 */
function cleanWingetOutput(output: string): string[] {
  // Сначала разбиваем по \n
  const rawLines = output.split("\n");
  const cleanedLines: string[] = [];

  for (const rawLine of rawLines) {
    // Каждая строка может содержать несколько "версий" через \r
    // Берем последнюю непустую часть
    const parts = rawLine.split("\r");

    // Идём с конца и ищем первую непустую часть
    let cleanPart = "";
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i].trim();
      if (part.length > 0) {
        // Проверяем, что это не просто спиннер
        const withoutSpinner = part
          .replace(/^[\s\-\\|/]+/, "") // Спиннер в начале
          .replace(/[\s\-\\|/]+$/, "") // Спиннер в конце
          .replace(/[█▌▐░▒▓]/g, "") // Прогресс-бар
          .trim();

        if (withoutSpinner.length > 0) {
          cleanPart = withoutSpinner;
          break;
        }
      }
    }

    if (cleanPart.length > 0) {
      cleanedLines.push(cleanPart);
    }
  }

  return cleanedLines;
}

/**
 * Проверяет, содержит ли строка заголовок колонки и возвращает его позицию
 */
function findHeaderPosition(line: string, headers: string[]): number {
  for (const header of headers) {
    // Для кириллицы \b не работает корректно, используем indexOf
    const idx = line.indexOf(header);
    if (idx !== -1) {
      // Проверяем, что это отдельное слово (пробел или начало строки до, пробел после)
      const before = idx === 0 || /\s/.test(line[idx - 1]);
      const after = idx + header.length >= line.length || /\s/.test(line[idx + header.length]);
      if (before && after) {
        debugLog(`Found header "${header}" at position ${idx}`);
        return idx;
      }
    }
  }
  return -1;
}

/**
 * Находит строку заголовка в выводе winget
 */
function findHeaderLine(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasName = NAME_HEADERS.some((h) => line.includes(h));
    const hasId = ID_HEADERS.some((h) => line.includes(h));
    const hasVersion = VERSION_HEADERS.some((h) => line.includes(h));

    debugLog(
      `Line ${i}: hasName=${hasName}, hasId=${hasId}, hasVersion=${hasVersion}, content="${line.substring(0, 80)}..."`,
    );

    if (hasName && hasId && hasVersion) {
      debugLog(`Header found at line ${i}`);
      return i;
    }
  }
  debugLog("Header line not found!");
  return -1;
}

/**
 * Находит строку разделителя (содержит только "-")
 */
function findSeparatorLine(lines: string[], startFrom: number): number {
  for (let i = startFrom; i < Math.min(startFrom + 5, lines.length); i++) {
    const line = lines[i].trim();
    // Строка должна состоять только из дефисов (обычных или Unicode)
    const isSeparator = line.length > 10 && /^[-─]+$/.test(line);
    debugLog(
      `Line ${i} separator check: length=${line.length}, isSeparator=${isSeparator}, line="${line.substring(0, 50)}"`,
    );
    if (isSeparator) {
      debugLog(`Separator found at line ${i}`);
      return i;
    }
  }
  debugLog("Separator line not found!");
  return -1;
}

/**
 * Определяет позиции колонок по строке заголовка
 */
function detectColumnPositions(headerLine: string): ColumnPosition | null {
  debugLog("Detecting column positions from header:", headerLine);

  const namePos = findHeaderPosition(headerLine, NAME_HEADERS);
  const idPos = findHeaderPosition(headerLine, ID_HEADERS);
  const versionPos = findHeaderPosition(headerLine, VERSION_HEADERS);
  const availablePos = findHeaderPosition(headerLine, AVAILABLE_HEADERS);
  const sourcePos = findHeaderPosition(headerLine, SOURCE_HEADERS);

  debugLog(
    `Positions: name=${namePos}, id=${idPos}, version=${versionPos}, available=${availablePos}, source=${sourcePos}`,
  );

  if (namePos === -1 || idPos === -1 || versionPos === -1) {
    debugLog("Missing required columns!");
    return null;
  }

  const positions: ColumnPosition = {
    name: namePos,
    id: idPos,
    version: versionPos,
  };

  if (availablePos !== -1) {
    positions.available = availablePos;
  }

  if (sourcePos !== -1) {
    positions.source = sourcePos;
  }

  return positions;
}

/**
 * Извлекает значение колонки по позиции
 */
function extractColumn(line: string, startPos: number, nextPos?: number): string {
  if (startPos >= line.length) {
    return "";
  }

  let value: string;
  if (nextPos !== undefined && nextPos > startPos) {
    value = line.substring(startPos, Math.min(nextPos, line.length));
  } else {
    value = line.substring(startPos);
  }

  return value
    .trim()
    .replace(/…$/, "")
    .replace(/\.\.\.$/, "");
}

/**
 * Проверяет, является ли строка служебной
 */
function isServiceLine(line: string): boolean {
  const trimmed = line.trim();

  if (trimmed.length === 0) {
    return true;
  }

  // Строка только из дефисов
  if (/^[-─]+$/.test(trimmed)) {
    return true;
  }

  // Сообщения winget
  const lowerLine = trimmed.toLowerCase();
  const serviceMessages = [
    "no installed package",
    "no package found",
    "no upgrades available",
    "upgrades available",
    "не найдены",
    "не найден",
    "нет доступных",
    "обновлений нет",
    "пакетов не найдено",
    "доступны обновления",
  ];

  for (const msg of serviceMessages) {
    if (lowerLine.includes(msg)) {
      return true;
    }
  }

  return false;
}

/**
 * Парсит строки данных на основе позиций колонок
 */
function parseDataLines(
  lines: string[],
  startLine: number,
  positions: ColumnPosition,
  parseErrors: string[],
): WingetPackage[] {
  const packages: WingetPackage[] = [];

  // Создаем массив позиций для извлечения колонок
  const columnOrder: Array<{ key: string; pos: number }> = [
    { key: "name", pos: positions.name },
    { key: "id", pos: positions.id },
    { key: "version", pos: positions.version },
  ];

  if (positions.available !== undefined) {
    columnOrder.push({ key: "available", pos: positions.available });
  }

  if (positions.source !== undefined) {
    columnOrder.push({ key: "source", pos: positions.source });
  }

  // Сортируем по позиции
  columnOrder.sort((a, b) => a.pos - b.pos);
  debugLog("Column order:", columnOrder);

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];

    if (isServiceLine(line)) {
      debugLog(`Line ${i}: skipping service line`);
      continue;
    }

    // Минимальная длина строки
    if (line.length < 10) {
      debugLog(`Line ${i}: too short (${line.length})`);
      continue;
    }

    const pkg: Record<string, string> = {};

    for (let j = 0; j < columnOrder.length; j++) {
      const col = columnOrder[j];
      const nextCol = columnOrder[j + 1];
      const value = extractColumn(line, col.pos, nextCol?.pos);
      pkg[col.key] = value;
    }

    debugLog(`Line ${i} parsed:`, pkg);

    // Проверяем, что есть хотя бы name и id
    if (pkg.name && pkg.id && pkg.name.length > 0 && pkg.id.length > 0) {
      packages.push({
        name: pkg.name,
        id: pkg.id,
        version: pkg.version || "",
        availableVersion: pkg.available || undefined,
        source: pkg.source || undefined,
      });
    } else {
      parseErrors.push(`Line ${i} missing name or id: name="${pkg.name}", id="${pkg.id}"`);
    }
  }

  return packages;
}

/**
 * Универсальный парсер вывода winget
 */
function parseWingetTable(output: string): ParseResult {
  const debug: DebugInfo = {
    rawOutput: output,
    cleanedLines: [],
    headerLineIndex: -1,
    headerLine: null,
    separatorIndex: -1,
    positions: null,
    dataStartLine: -1,
    parseErrors: [],
  };

  debugLog("=== START PARSING ===");
  debugLog("Raw output length:", output?.length);

  if (!output || output.trim().length === 0) {
    debug.parseErrors.push("Empty output received");
    return { packages: [], error: "Empty output", debug };
  }

  // Очищаем вывод от мусора winget (спиннеры, прогресс-бары)
  const lines = cleanWingetOutput(output);
  debug.cleanedLines = lines;
  debugLog("Cleaned lines count:", lines.length);
  debugLog("Cleaned lines first 5:", lines.slice(0, 5));

  if (lines.length === 0) {
    debug.parseErrors.push("No valid lines after cleanup");
    return { packages: [], error: "No valid lines after cleanup", debug };
  }

  // Находим заголовок
  const headerLineIndex = findHeaderLine(lines);
  debug.headerLineIndex = headerLineIndex;

  if (headerLineIndex === -1) {
    // Проверяем, может быть это сообщение об отсутствии пакетов
    const lowerOutput = output.toLowerCase();
    if (
      lowerOutput.includes("no installed package") ||
      lowerOutput.includes("no package found") ||
      lowerOutput.includes("no upgrades") ||
      lowerOutput.includes("не найдены") ||
      lowerOutput.includes("не найден") ||
      lowerOutput.includes("нет обновлений")
    ) {
      debugLog("No packages message detected");
      return { packages: [], debug };
    }
    debug.parseErrors.push("Header line not found");
    return { packages: [], error: "Header line not found in output", debug };
  }

  const headerLine = lines[headerLineIndex];
  debug.headerLine = headerLine;
  debugLog("Header line:", headerLine);

  // Определяем позиции колонок
  const positions = detectColumnPositions(headerLine);
  debug.positions = positions;

  if (!positions) {
    debug.parseErrors.push("Failed to detect column positions");
    return { packages: [], error: "Failed to detect column positions from header", debug };
  }

  // Находим разделитель
  const separatorIndex = findSeparatorLine(lines, headerLineIndex + 1);
  debug.separatorIndex = separatorIndex;

  const dataStartLine = separatorIndex !== -1 ? separatorIndex + 1 : headerLineIndex + 1;
  debug.dataStartLine = dataStartLine;
  debugLog("Data starts at line:", dataStartLine);

  // Парсим строки данных
  const packages = parseDataLines(lines, dataStartLine, positions, debug.parseErrors);
  debugLog("Parsed packages count:", packages.length);
  debugLog("=== END PARSING ===");

  return { packages, debug };
}

/**
 * Парсинг вывода winget upgrade
 */
export function parseUpgradeOutput(output: string): ParseResult {
  debugLog("parseUpgradeOutput called");
  return parseWingetTable(output);
}

/**
 * Парсинг вывода winget search
 */
export function parseSearchOutput(output: string): ParseResult {
  debugLog("parseSearchOutput called");
  return parseWingetTable(output);
}

/**
 * Парсинг вывода winget list
 */
export function parseListOutput(output: string): ParseResult {
  debugLog("parseListOutput called");
  return parseWingetTable(output);
}

/**
 * Универсальный парсер
 */
export function parseWingetOutput(output: string): ParseResult {
  debugLog("parseWingetOutput called");
  return parseWingetTable(output);
}
