import { showHUD, showToast, Toast, getSelectedFinderItems } from "@raycast/api";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

export default async function command() {
  try {
    // 獲取選中的檔案
    const selectedItems = await getSelectedFinderItems();

    if (!selectedItems || selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "請先選擇 Excel 檔案",
      });
      return;
    }

    let successCount = 0;

    for (const item of selectedItems) {
      const filePath = item.path;
      const fileExt = path.extname(filePath).toLowerCase();

      // 檢查是否為 Excel 檔案
      if (![".xls", ".xlsx"].includes(fileExt)) {
        continue;
      }

      try {
        // 讀取 Excel 檔案
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 轉換為 CSV
        const csvContent = XLSX.utils.sheet_to_csv(worksheet);

        // 建立輸出檔案路徑
        const outputPath = filePath.replace(/\.[^/.]+$/, "") + ".csv";

        // 寫入 CSV 檔案
        fs.writeFileSync(outputPath, csvContent, "utf-8");

        successCount++;
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "轉換失敗",
          message: String(error),
        });
      }
    }

    // 顯示結果
    if (successCount > 0) {
      await showHUD(`✅ 成功轉換 ${successCount} 個檔案`);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "轉換失敗",
        message: "請確認選擇的是有效的 Excel 檔案",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "發生錯誤",
      message: String(error),
    });
  }
}
