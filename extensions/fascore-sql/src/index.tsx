import React from "react";
import { useEffect, useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";



interface sql {
  tableEnum: string;
  tableName: string;
  primaryKeyName: string;
  executionSql: string;
}

const sqls: sql[] = [
  {
    tableEnum: "0",
    tableName: "fas_master_order",
    primaryKeyName: "master_order_no",
    executionSql: "",
  },
  {
    tableEnum: "1",
    tableName: "fas_order",
    primaryKeyName: "order_no",
    executionSql: "",
  },
  {
    tableEnum: "2",
    tableName: "fas_bill_order",
    primaryKeyName: "bill_no",
    executionSql: "",
  },
  {
    tableEnum: "3",
    tableName: "fas_fund_operation",
    primaryKeyName: "operation_id",
    executionSql: "",
  },
  {
    tableEnum: "4",
    tableName: "fas_asset_operation",
    primaryKeyName: "operation_id",
    executionSql: "",
  },
  {
    tableEnum: "5",
    tableName: "fas_note",
    primaryKeyName: "note_id",
    executionSql: "",
  },
  {
    tableEnum: "6",
    tableName: "fas_pledge_operation",
    primaryKeyName: "operation_id",
    executionSql: "",
  },
  {
    tableEnum: "9",
    tableName: "biz_ctrl_order",
    primaryKeyName: "ctrl_order_no",
    executionSql: "",
  },
];

function buildSql(orderNo: string, elment: sql) {
  // 订单号的第14位是数据库表枚举位
  const tableEnum  = orderNo.substring(13, 14);
  if (elment.tableEnum === tableEnum) {
    elment.executionSql = `select * from ${elment.tableName} where ${elment.primaryKeyName} = '${orderNo}';`
    return elment.executionSql;
  }
  return '';
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(sqls);

  useEffect(() => {
    filterList(sqls.filter((item) => buildSql(searchText, item) !== ''));
  }, [searchText]);

  return (
    <List 
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search fascore * orders"
      searchBarPlaceholder="请输入单号"
    >
      {filteredList.map((item) => (
        <List.Item
          key={item.tableName}
          title={item.executionSql}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy to clipboard" content={item.executionSql} />
              <Action title="Select" onAction={() => console.log(`${item.tableName} selected, execution sql ${item.executionSql}`)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}