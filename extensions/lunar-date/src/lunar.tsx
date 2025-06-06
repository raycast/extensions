import React, { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast, Clipboard, Icon, Detail } from "@raycast/api";
import { Solar, Lunar } from "lunar-typescript";

// Types for conversion direction
type ConversionDirection = "solar-to-lunar" | "lunar-to-solar" | "auto-detect";

// Types for form values
interface FormValues {
  dateInput: string;
  conversionDirection: ConversionDirection;
}

// Types for conversion results
interface ConversionResult {
  success: boolean;
  originalDate: string;
  convertedDate: string;
  culturalInfo: {
    zodiac?: string;
    festivals?: string[];
    solarTerm?: string;
    lunarMonth?: string;
    lunarDay?: string;
    ganZhi?: string;
  };
  error?: string;
}

export default function LunarDateConverter() {
  const [formValues, setFormValues] = useState<FormValues>({
    dateInput: "",
    conversionDirection: "auto-detect",
  });
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-detect date format and conversion direction
  function detectDateFormat(input: string): { format: string; direction: ConversionDirection } {
    const trimmed = input.trim();

    // Solar date patterns (YYYY-MM-DD, MM/DD/YYYY, yyyyMMdd, etc.)
    const solarPatterns = [
      /^\d{4}-\d{1,2}-\d{1,2}$/, // 2024-01-15
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // 01/15/2024
      /^\d{4}\/\d{1,2}\/\d{1,2}$/, // 2024/01/15
      /^\d{4}\.\d{1,2}\.\d{1,2}$/, // 2024.01.15
      /^\d{8}$/, // 20240115 (yyyyMMdd)
    ];

    // Lunar date patterns (Chinese characters or specific formats)
    const lunarPatterns = [/农历|阴历|lunar/i, /[一二三四五六七八九十][月]/, /[初]?[一二三四五六七八九十][日]/];

    for (const pattern of solarPatterns) {
      if (pattern.test(trimmed)) {
        return { format: "solar", direction: "solar-to-lunar" };
      }
    }

    for (const pattern of lunarPatterns) {
      if (pattern.test(trimmed)) {
        return { format: "lunar", direction: "lunar-to-solar" };
      }
    }

    // Default to solar if unclear
    return { format: "solar", direction: "solar-to-lunar" };
  }

  // Parse solar date from various formats
  function parseSolarDate(input: string): Date | null {
    const trimmed = input.trim();

    try {
      // Try YYYY-MM-DD format
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
        return new Date(trimmed);
      }

      // Try yyyyMMdd format (20240115) - must be exactly 8 digits
      if (/^\d{8}$/.test(trimmed)) {
        const year = parseInt(trimmed.substring(0, 4));
        const month = parseInt(trimmed.substring(4, 6));
        const day = parseInt(trimmed.substring(6, 8));
        return new Date(year, month - 1, day);
      }

      // Try MM/DD/YYYY format
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
        const [month, day, year] = trimmed.split("/");
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // Try YYYY/MM/DD format
      if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(trimmed)) {
        const [year, month, day] = trimmed.split("/");
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // Try YYYY.MM.DD format
      if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(trimmed)) {
        const [year, month, day] = trimmed.split(".");
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // Do NOT fallback to Date constructor for partial inputs
      return null;
    } catch {
      return null;
    }
  }

  // Convert solar date to lunar
  function convertSolarToLunar(date: Date): ConversionResult {
    try {
      const solar = Solar.fromDate(date);
      const lunar = solar.getLunar();

      return {
        success: true,
        originalDate: `Solar: ${solar.toYmd()}`,
        convertedDate: `Lunar: ${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
        culturalInfo: {
          zodiac: lunar.getYearShengXiao(),
          festivals: lunar.getFestivals(),
          solarTerm: undefined, // Remove getJieQi() as it doesn't exist
          lunarMonth: lunar.getMonthInChinese(),
          lunarDay: lunar.getDayInChinese(),
          ganZhi: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日`,
        },
      };
    } catch (error) {
      return {
        success: false,
        originalDate: "",
        convertedDate: "",
        culturalInfo: {},
        error: `Error converting solar date: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  // Parse lunar date from various formats
  function parseLunarDate(input: string): { year: number; month: number; day: number; isLeap?: boolean } | null {
    const trimmed = input.trim();

    try {
      // Pattern 1: "农历2024年正月初八" or "阴历2024年一月初八"
      const pattern1 =
        /(?:农历|阴历)?(\d{4})年?([正一二三四五六七八九十冬腊]{1,2})月?([初]?[一二三四五六七八九十廿]{1,4})/;
      const match1 = trimmed.match(pattern1);
      if (match1) {
        const year = parseInt(match1[1]);
        const monthStr = match1[2];
        const dayStr = match1[3];

        // Convert Chinese month names to numbers
        const monthMap: { [key: string]: number } = {
          正: 1,
          一: 1,
          二: 2,
          三: 3,
          四: 4,
          五: 5,
          六: 6,
          七: 7,
          八: 8,
          九: 9,
          十: 10,
          冬: 11,
          腊: 12,
        };

        const month = monthMap[monthStr] || 1;
        const day = parseChineseDay(dayStr);

        return { year, month, day };
      }

      // Pattern 2: "2024-01-15" (treat as lunar if context suggests)
      const pattern2 = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
      const match2 = trimmed.match(pattern2);
      if (match2) {
        return {
          year: parseInt(match2[1]),
          month: parseInt(match2[2]),
          day: parseInt(match2[3]),
        };
      }

      // Pattern 3: Simple format like "正月初八" (use current year)
      const pattern3 = /^([正一二三四五六七八九十冬腊]{1,2})月?([初]?[一二三四五六七八九十廿]{1,4})$/;
      const match3 = trimmed.match(pattern3);
      if (match3) {
        const currentYear = new Date().getFullYear();
        const monthStr = match3[1];
        const dayStr = match3[2];

        const monthMap: { [key: string]: number } = {
          正: 1,
          一: 1,
          二: 2,
          三: 3,
          四: 4,
          五: 5,
          六: 6,
          七: 7,
          八: 8,
          九: 9,
          十: 10,
          冬: 11,
          腊: 12,
        };

        const month = monthMap[monthStr] || 1;
        const day = parseChineseDay(dayStr);

        return { year: currentYear, month, day };
      }

      // Pattern 4: More flexible year extraction "2024年正月初八"
      const pattern4 = /(\d{4})年([正一二三四五六七八九十冬腊]{1,2})月?([初]?[一二三四五六七八九十廿]{1,4})/;
      const match4 = trimmed.match(pattern4);
      if (match4) {
        const year = parseInt(match4[1]);
        const monthStr = match4[2];
        const dayStr = match4[3];

        const monthMap: { [key: string]: number } = {
          正: 1,
          一: 1,
          二: 2,
          三: 3,
          四: 4,
          五: 5,
          六: 6,
          七: 7,
          八: 8,
          九: 9,
          十: 10,
          冬: 11,
          腊: 12,
        };

        const month = monthMap[monthStr] || 1;
        const day = parseChineseDay(dayStr);

        return { year, month, day };
      }

      return null;
    } catch {
      return null;
    }
  }

  // Helper function to parse Chinese day numbers
  function parseChineseDay(dayStr: string): number {
    let day = 1;

    if (dayStr.startsWith("初")) {
      const dayPart = dayStr.substring(1);
      const dayMap: { [key: string]: number } = {
        一: 1,
        二: 2,
        三: 3,
        四: 4,
        五: 5,
        六: 6,
        七: 7,
        八: 8,
        九: 9,
        十: 10,
      };
      day = dayMap[dayPart] || 1;
    } else {
      const dayMap: { [key: string]: number } = {
        一: 1,
        二: 2,
        三: 3,
        四: 4,
        五: 5,
        六: 6,
        七: 7,
        八: 8,
        九: 9,
        十: 10,
        十一: 11,
        十二: 12,
        十三: 13,
        十四: 14,
        十五: 15,
        十六: 16,
        十七: 17,
        十八: 18,
        十九: 19,
        二十: 20,
        廿一: 21,
        廿二: 22,
        廿三: 23,
        廿四: 24,
        廿五: 25,
        廿六: 26,
        廿七: 27,
        廿八: 28,
        廿九: 29,
        三十: 30,
      };
      day = dayMap[dayStr] || 1;
    }

    return day;
  }

  // Convert lunar date to solar (improved implementation)
  function convertLunarToSolar(input: string): ConversionResult {
    try {
      const parsedLunar = parseLunarDate(input);
      if (!parsedLunar) {
        return {
          success: false,
          originalDate: "",
          convertedDate: "",
          culturalInfo: {},
          error: "Invalid lunar date format. Please use formats like '农历2024年正月初八' or '正月初八'",
        };
      }

      // Validate lunar date range
      if (parsedLunar.year < 1900 || parsedLunar.year > 2100) {
        return {
          success: false,
          originalDate: "",
          convertedDate: "",
          culturalInfo: {},
          error: "Lunar year must be between 1900 and 2100.",
        };
      }

      // Create lunar date object
      const lunar = Lunar.fromYmd(parsedLunar.year, parsedLunar.month, parsedLunar.day);
      const solar = lunar.getSolar();

      return {
        success: true,
        originalDate: `农历${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
        convertedDate: `公历${solar.getYear()}年${solar.getMonth()}月${solar.getDay()}日 (${solar.toYmd()})`,
        culturalInfo: {
          zodiac: lunar.getYearShengXiao(),
          festivals: lunar.getFestivals(),
          lunarMonth: lunar.getMonthInChinese(),
          lunarDay: lunar.getDayInChinese(),
          ganZhi: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日`,
        },
      };
    } catch (error) {
      return {
        success: false,
        originalDate: "",
        convertedDate: "",
        culturalInfo: {},
        error: `Error converting lunar date: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  // Perform conversion based on input and direction
  function performConversion(input: string, direction: ConversionDirection): ConversionResult {
    if (!input.trim()) {
      return {
        success: false,
        originalDate: "",
        convertedDate: "",
        culturalInfo: {},
        error: "Please enter a date",
      };
    }

    let actualDirection = direction;

    // Auto-detect if needed
    if (direction === "auto-detect") {
      const detected = detectDateFormat(input);
      actualDirection = detected.direction;
    }

    if (actualDirection === "solar-to-lunar") {
      const date = parseSolarDate(input);
      if (!date || isNaN(date.getTime())) {
        return {
          success: false,
          originalDate: "",
          convertedDate: "",
          culturalInfo: {},
          error: "Invalid solar date format. Please use YYYY-MM-DD, MM/DD/YYYY, or similar formats.",
        };
      }

      // Validate date range (1900-2100 as supported by most lunar libraries)
      const year = date.getFullYear();
      if (year < 1900 || year > 2100) {
        return {
          success: false,
          originalDate: "",
          convertedDate: "",
          culturalInfo: {},
          error: "Date must be between years 1900 and 2100.",
        };
      }

      return convertSolarToLunar(date);
    } else {
      return convertLunarToSolar(input);
    }
  }

  // Handle form submission and real-time conversion
  useEffect(() => {
    if (formValues.dateInput.trim()) {
      setIsLoading(true);

      // Debounce conversion
      const timeoutId = setTimeout(() => {
        const result = performConversion(formValues.dateInput, formValues.conversionDirection);
        setConversionResult(result);
        setIsLoading(false);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setConversionResult(null);
      setIsLoading(false);
    }
  }, [formValues.dateInput, formValues.conversionDirection]);

  // Get today's date in both calendars
  function getTodaysDate(): ConversionResult {
    const today = new Date();
    return convertSolarToLunar(today);
  }

  // Copy result to clipboard
  async function copyToClipboard(text: string) {
    try {
      await Clipboard.copy(text);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard",
        message: text,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Render results section with simple, eye-catching format using Detail for larger display
  function renderResults() {
    if (isLoading) {
      return "⏳ Converting...";
    }

    if (!conversionResult) {
      return `🌙 Lunar Date Converter

Enter a date to convert between solar and lunar calendars

Examples:
📅 2024-01-15 or 20240115  →  农历2023年腊月初五
🌙 农历2024年正月初八  →  2024-02-17`;
    }

    if (!conversionResult.success) {
      return `❌ ${conversionResult.error}

Try: 2024-01-15, 20240115, or 农历2024年正月初八`;
    }

    const { convertedDate, culturalInfo } = conversionResult;

    // Simple, eye-catching result with zodiac
    let result = `# 🎯 ${convertedDate}`;

    if (culturalInfo.zodiac) {
      result += `\n\n## ${culturalInfo.zodiac} 🐲`;
    }

    return result;
  }

  // Check if input is complete enough to show Detail view
  function isCompleteInput(input: string): boolean {
    const trimmed = input.trim();

    // Must be at least 8 characters for a complete date
    if (trimmed.length < 8) {
      return false;
    }

    // Check for complete date patterns
    const completePatterns = [
      /^\d{4}-\d{1,2}-\d{1,2}$/, // 2024-01-15
      /^\d{8}$/, // 20240115
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // 01/15/2024
      /^\d{4}\/\d{1,2}\/\d{1,2}$/, // 2024/01/15
      /^\d{4}\.\d{1,2}\.\d{1,2}$/, // 2024.01.15
      // Chinese lunar patterns
      /(?:农历|阴历)?\d{4}年?[正一二三四五六七八九十冬腊]{1,2}月?[初]?[一二三四五六七八九十廿]{1,4}/,
      /\d{4}年[正一二三四五六七八九十冬腊]{1,2}月?[初]?[一二三四五六七八九十廿]{1,4}/,
      /^[正一二三四五六七八九十冬腊]{1,2}月?[初]?[一二三四五六七八九十廿]{1,4}$/,
    ];

    return completePatterns.some((pattern) => pattern.test(trimmed));
  }

  // Check if we should show Detail view for larger display
  const shouldShowDetail =
    conversionResult?.success && formValues.dateInput.trim() && isCompleteInput(formValues.dateInput);

  if (shouldShowDetail) {
    return (
      <Detail
        markdown={renderResults()}
        actions={
          <ActionPanel>
            <Action title="Back to Input" icon={Icon.ArrowLeft} onAction={() => setConversionResult(null)} />
            <Action
              title="Copy Result"
              icon={Icon.Clipboard}
              onAction={() => copyToClipboard(conversionResult!.convertedDate)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Today's Date"
              icon={Icon.Calendar}
              onAction={() => {
                const todayResult = getTodaysDate();
                setConversionResult(todayResult);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Today's Date"
            icon={Icon.Calendar}
            onAction={() => {
              const todayResult = getTodaysDate();
              setConversionResult(todayResult);
              if (todayResult.success) {
                showToast({
                  style: Toast.Style.Success,
                  title: "Today's Conversion",
                  message: todayResult.convertedDate,
                });
              }
            }}
          />
          {conversionResult?.success && (
            <>
              <Action
                title="Copy Converted Date"
                icon={Icon.Clipboard}
                onAction={() => copyToClipboard(conversionResult.convertedDate)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Copy Full Result"
                icon={Icon.CopyClipboard}
                onAction={() => copyToClipboard(renderResults())}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="dateInput"
        title="Date Input"
        placeholder="Enter date (e.g., 2024-01-15, 20240115, or 农历十二月初八)"
        value={formValues.dateInput}
        onChange={(newValue) => setFormValues((prev) => ({ ...prev, dateInput: newValue }))}
        info="Supports formats: YYYY-MM-DD, yyyyMMdd, MM/DD/YYYY, YYYY/MM/DD, YYYY.MM.DD"
      />

      <Form.Dropdown
        id="conversionDirection"
        title="Conversion Direction"
        value={formValues.conversionDirection}
        onChange={(newValue) =>
          setFormValues((prev) => ({
            ...prev,
            conversionDirection: newValue as ConversionDirection,
          }))
        }
      >
        <Form.Dropdown.Item value="auto-detect" title="🔍 Auto Detect" />
        <Form.Dropdown.Item value="solar-to-lunar" title="☀️ Solar → Lunar" />
        <Form.Dropdown.Item value="lunar-to-solar" title="🌙 Lunar → Solar" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description title="Results" text={renderResults()} />
    </Form>
  );
}
