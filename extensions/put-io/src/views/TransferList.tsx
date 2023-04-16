import { ActionPanel, showToast, Toast, List, Color, Action, Icon, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import TransferDetails from "../components/TransferDetails";
import FileBrowser from "./FileBrowser";
import PutioAPI, { Transfer } from "@putdotio/api-client";
import useInterval from "../hooks/useInterval";
import timeDifference from "../utils/timeDifference";
import changeTimezone from "../utils/changeTimezone";
import formatSize from "../utils/formatSize";
import { preferences } from "../preferences";

function TransferList() {
  // State vars and handlers
  const [transfers, setTransfers] = useState<Transfer[]>();
  const [cancelTransferId, setCancelTransferId] = useState<number>();
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [error, setError] = useState<Error>();
  const { push } = useNavigation();

  useHandleError(error);

  //
  // Get list of transfers
  useInterval(() => {
    const putioAPI = new PutioAPI({ clientID: Number(preferences.putioClientId) });
    putioAPI.setToken(preferences.putioOAuthToken);

    // Query for a list of transfers
    putioAPI.Transfers.Query()
      .then((t) => {
        // Filter the transfer list to only include completed items.
        // setTransfers(t.data.transfers.filter((transfer) => transfer.percent_done >= 0));
        // Reverse-sort the transfer list by when it was created.
        setTransfers(
          t.data.transfers.sort((n1, n2) => {
            if (n1.created_at < n2.created_at) {
              return 1;
            }

            if (n1.created_at > n2.created_at) {
              return -1;
            }
            return 0;
          })
        );
      })
      .catch((e) => {
        console.log("An error occurred while fetching transfers: ", e);
        setError(new Error("Error fetching transfer details from put.io."));
      });
  }, 1000);

  //
  // Delete a transfer
  useEffect(() => {
    if (cancelTransferId !== undefined) {
      const putioAPI = new PutioAPI({ clientID: Number(preferences.putioClientId) });
      putioAPI.setToken(preferences.putioOAuthToken);

      // Query for a list of transfers
      putioAPI.Transfers.Cancel([cancelTransferId])
        .then(() => {
          setCancelTransferId(undefined); // Clear the delete transfer id.
          showToast({
            style: Toast.Style.Success,
            title: "Success",
            message: "Transfer was cancelled.",
          });
        })
        .catch((e) => {
          console.log("An error occurred while cancelling a transfer: ", e);
          setError(new Error("Error cancelling transfer."));
        });
    }
  }, [cancelTransferId]);

  return (
    <List isLoading={transfers === undefined} isShowingDetail={isShowingDetail} navigationTitle="Put.io Transfers">
      {transfers && transfers.length == 0 ? (
        <List.EmptyView icon={{ source: "putio-icon.png" }} title="There doesn't seem to be anything here." />
      ) : (
        transfers &&
        Object.values(transfers).map((transfer) => {
          let icon = null;
          let downloadPercent = "";
          switch (transfer.status) {
            case "PREPARING_DOWNLOAD":
            case "DOWNLOADING":
            case "COMPLETING":
              icon = { source: Icon.Download, tintColor: Color.Blue };
              break;
            case "STOPPING":
              icon = { source: Icon.XMarkCircle };
              break;
            case "WAITING":
            case "IN_QUEUE":
            case "WAITING_FOR_COMPLETE_QUEUE":
              icon = { source: Icon.Clock };
              break;
            case "ERROR":
              icon = { source: Icon.ExclamationMark, tintColor: Color.Red };
              break;
            case "SEEDING":
              icon = { source: Icon.Upload, tintColor: Color.Green };
              break;
            case "COMPLETED":
              icon = { source: Icon.Checkmark };
              break;
          }
          const accessories = [];
          if (isShowingDetail == false) {
            switch (transfer.status) {
              case "DOWNLOADING":
                downloadPercent = parseFloat(String((transfer.downloaded / transfer.size) * 100)).toFixed(1);
                accessories.push({ text: `${downloadPercent}%` });
                break;
              default:
                accessories.push({ text: formatSize(transfer.size, true, 1) });
                break;
            }
            const now = changeTimezone(new Date(), "UTC");
            if (new Date(transfer.created_at!) <= now) {
              accessories.push({ text: timeDifference(now, new Date(transfer.created_at!)) });
            }
          }
          return (
            <List.Item
              key={`${transfer.id}`}
              icon={icon}
              title={`${transfer.name}`}
              detail={<TransferDetails transferDetails={transfer} />}
              actions={
                <ActionPanel title="Transfer Actions">
                  <Action
                    icon={Icon.Sidebar}
                    title={isShowingDetail ? "Hide Transfer Details" : "Show Transfer Details"}
                    onAction={() => setIsShowingDetail((previous) => !previous)}
                  />
                  {transfer.file_id && (
                    <Action
                      icon={Icon.Document}
                      title="Go To File"
                      onAction={() => push(<FileBrowser parent_file_id={Number(transfer.file_id)} />)}
                    />
                  )}
                  <Action
                    title={"Cancel Transfer"}
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "delete" }}
                    onAction={() => {
                      setCancelTransferId(transfer.id);
                    }}
                  />
                </ActionPanel>
              }
              accessories={accessories}
            />
          );
        })
      )}
    </List>
  );
}

// Handle errors by showing the toast.
function useHandleError(error?: Error) {
  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);
}

export default TransferList;
