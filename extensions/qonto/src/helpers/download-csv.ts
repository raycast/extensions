import { showToast } from "@raycast/api";
import * as csvWriter from "csv-writer";
import { homedir } from "os";
import { join } from "path";
import { TransactionWithInitiator } from "../types/transaction-initiator";

export async function downloadCSV(data: TransactionWithInitiator[]) {
  if (data.length === 0) return;

  const date = new Date();
  //const member = data.find(d => !!d.initiator);
  const transaction = data[0].transaction;

  const initiatorHeaders = [
    { id: "initiator_first_name", title: "INITIATOR_FIRST_NAME" },
    { id: "initiator_last_name", title: "INITIATOR_LAST_NAME" },
    { id: "initiator_role", title: "INITIATOR_ROLE" },
  ];

  const transactionHeaders = Object.keys(transaction).map((key) => ({
    id: key,
    title: key.toUpperCase(),
  }));

  const dataMerged = data.map((d) => ({
    ...d.transaction,
    initiator_first_name: d.initiator?.first_name,
    initiator_last_name: d.initiator?.last_name,
    initiator_role: d.initiator?.role,
  }));

  const writer = csvWriter.createObjectCsvWriter({
    path: join(homedir(), "Desktop", `qonto-transactions-${date.toISOString()}.csv`),
    header: [...initiatorHeaders, ...transactionHeaders],
  });

  try {
    await writer.writeRecords(dataMerged);
    showToast({
      title: "CSV downloaded to ~/Desktop",
    });
  } catch (error) {
    showToast({
      title: "Oops",
      message: "Download CSV generated an error",
    });
    console.error("Oops download CSV generated an error:", error);
  }
}
