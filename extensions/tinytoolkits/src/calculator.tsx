import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
// import { calcTs, calcPy } from "../assets/calculator";
import { calcTs, calcPy } from "./utils/calculator";
import { getCalculatorBackend } from "./utils/config";
import debounce from "lodash.debounce";

// 定义计算结果接口
interface CalculationResult {
  success: boolean;
  original: string;
  hex: string;
  int: string;
  error?: string | null;
}

export default function Command() {
  // 状态管理
  const [searchText, setSearchText] = useState("");
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 防抖函数：仅执行计算，不更新 searchText
  const debouncedCalculate = useCallback(
    debounce(async (text: string) => {
      setIsLoading(true);
      try {
        if (text.trim()) {
          const backend = getCalculatorBackend();
          let calcResult: CalculationResult | null = null;
          if (backend === "js") {
            calcResult = await calcTs(text); // default to TypeScript
          } else if (backend === "py") {
            calcResult = await calcPy(text); // default to TypeScript
          } else {
            throw new Error("Invalid calculator backend");
          }
          if (!calcResult) {
            throw new Error("Invalid calculation result");
          }

          setResult(calcResult);

          // 如果计算失败，显示错误提示
          if (!calcResult.success && calcResult.error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Calculation Failed",
              message: calcResult.error,
            });
          }
        } else {
          setResult(null);
        }
      } catch (error) {
        // 错误处理
        let errorMessage = "Unknown error";
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        setResult({
          success: false,
          original: "Error",
          hex: "Error",
          int: "Error",
          error: errorMessage,
        });

        await showToast({
          style: Toast.Style.Failure,
          title: "Execution Failed",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }, 50), // 100ms 内输入内容不更新
    [],
  );

  // 监听 searchText 变化，触发防抖计算
  useEffect(() => {
    debouncedCalculate(searchText);
    return () => debouncedCalculate.cancel();
  }, [searchText, debouncedCalculate]);

  // 渲染 UI
  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder="Enter expression (e.g., 2+2, 10*5, 3**2, 100/3)"
      throttle
    >
      {result && result.success ? (
        <>
          {/* 原始结果 */}
          <List.Item
            title="Original"
            subtitle={result.original}
            icon={{ source: Icon.ChevronRight, tintColor: Color.Blue }}
            accessories={[{ text: result.original }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Original Result"
                  content={result.original}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.Paste
                  title="Paste Original Result"
                  content={result.original}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                />
              </ActionPanel>
            }
          />

          {/* 十六进制结果 */}
          <List.Item
            title="Hexadecimal"
            subtitle={result.hex}
            icon={{ source: Icon.ChevronRight, tintColor: Color.Green }}
            accessories={[{ text: result.hex }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Hex Result"
                  content={result.hex}
                  shortcut={{ modifiers: ["cmd"], key: "h" }}
                />
                <Action.Paste
                  title="Paste Hex Result"
                  content={result.hex}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                />
              </ActionPanel>
            }
          />

          {/* 整数结果 */}
          <List.Item
            title="Integer"
            subtitle={result.int}
            icon={{ source: Icon.ChevronRight, tintColor: Color.Orange }}
            accessories={[{ text: result.int }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Int Result"
                  content={result.int}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
                <Action.Paste
                  title="Paste Int Result"
                  content={result.int}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                />
              </ActionPanel>
            }
          />

          {/* 错误提示或警告 */}
          {result.error && (
            <List.Item
              title="Note"
              subtitle={result.error}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Yellow }}
            />
          )}
        </>
      ) : result && !result.success ? (
        // 显示错误
        <List.Item
          title="Error"
          subtitle={result.error || "Unknown error occurred"}
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
        />
      ) : (
        // 空状态视图
        <List.EmptyView
          icon={{ source: Icon.Calculator, tintColor: Color.SecondaryText }}
          title="Enter an expression to calculate"
          description="Examples: 2+2, 10*5, 3**2, 100/3, 2**10"
        />
      )}
    </List>
  );
}
