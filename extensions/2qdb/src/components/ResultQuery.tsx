/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import { createPool, query } from "@src/db";
import { convertArrayToTableString } from "@src/util";
import React, { useState } from "react";
import { writeFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import XLSX from "xlsx";

export const downloadJsonFile = async (data: any[], filename: string) => {
  const path = join(homedir(), "Downloads", filename);

  try {
    const toast = await showToast(
      Toast.Style.Animated,
      "Downloading file",
      "Please wait..."
    );
    const response = data;
    const jsonString = JSON.stringify(response, null, 2);

    await writeFile(path, jsonString);

    toast.title = "Downloaded";
    toast.message = `${path}`;
    toast.style = Toast.Style.Success;
  } catch (error) {
    await showToast(Toast.Style.Failure, "Download failed", "Please try again");
  }
};

export const downloadExcelFile = async (data: any, filename: string) => {
  const path = join(homedir(), "Downloads", filename);

  try {
    const toast = await showToast(
      Toast.Style.Animated,
      "Downloading file",
      "Please wait..."
    );
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet 1");
    XLSX.writeFile(workbook, path);

    toast.title = "Downloaded";
    toast.message = `${path}`;
    toast.style = Toast.Style.Success;
  } catch (error) {
    await showToast(Toast.Style.Failure, "Download failed", "Please try again");
  }
};

export default function ResultQuery({
  result,
  queryString,
  config,
  total,
}: {
  result: any[];
  queryString: string;
  config: any;
  total: number;
}) {

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [queryResult, setQueryResult] = useState<any[]>(result);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const content = convertArrayToTableString(queryResult);

  const markdown = `
  ## Result: Total ${total} ${total <= 1 ? "record" : "records"}

  ${content}
`;

  const handleLoadMore = async () => {
    if (total === queryResult.length) {
      showToast({
        style: Toast.Style.Failure,
        title: `Cannot load more!`,
      });
      return;
    }
    const pool = createPool(config);
    setCurrentPage(prevState => prevState + 1);
    setIsLoading(true);
    const { executionTime, result, totalRecord } = await query({
      pool,
      sql: queryString,
      currentPage: currentPage + 1,
    });

    setQueryResult(prev => [...prev, ...result]);

    showToast({
      style: Toast.Style.Success,
      title: `Time: ${executionTime} ms, Total: ${totalRecord}`,
    });
    setIsLoading(false);
  };

  return (
    <Detail
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Info}
            title="Load More"
            onAction={handleLoadMore}
          />
          <Action
            shortcut={{ modifiers: ["cmd", "opt"], key: "j" }}
            title="Download Json File"
            icon={{ source: Icon.Download }}
            onAction={() => {
              downloadJsonFile(result, "result_sql.json");
            }}
          />
          <Action
            shortcut={{ modifiers: ["cmd", "opt"], key: "e" }}
            title="Download Excel File"
            icon={{ source: Icon.Download }}
            onAction={() => {
              downloadExcelFile(result, "result_sql.xlsx");
            }}
          />
        </ActionPanel>
      }
      markdown={markdown}
    />
  );
}
