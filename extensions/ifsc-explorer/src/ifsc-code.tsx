import {
  List,
  Toast,
  showToast,
  Clipboard,
  LocalStorage,
  ActionPanel,
  Action,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
const ifsc = require("ifsc");

interface details {
  MICR: string;
  BRANCH: string;
  ADDRESS: string;
  STATE: string;
  CONTACT: string;
  UPI: boolean;
  RTGS: boolean;
  CITY: string;
  CENTRE: string;
  DISTRICT: string;
  NEFT: boolean;
  IMPS: boolean;
  SWIFT: string;
  BANK: string;
  BANKCODE: string;
  IFSC: string;
}

interface codes {
  uuid: number;
  code: string;
  details: details;
}

export default function Command() {
  const [codes, setCodes] = useState<codes[]>([]);

  useEffect(() => {
    async function readClipboard() {
      let parsedCodes: codes[] = codes;

      const text = await Clipboard.readText();

      const storedData = await LocalStorage.getItem("storedCodes");
      if (storedData != undefined) {
        parsedCodes = JSON.parse(String(storedData));
        setCodes(parsedCodes);
      }

      if (text?.match("^[A-Z]{4}0[A-Z0-9]{6}$")) {
        if (!ifsc.validate(text)) {
          showToast({
            style: Toast.Style.Failure,
            title: "Invalid IFSC Code",
            message: "📋 Copied IFSC code is not valid.",
          });
        } else if (
          !parsedCodes[0] ||
          (parsedCodes[0] && parsedCodes[0].code != text)
        ) {
          ifsc.fetchDetails(text).then(function (res: details) {
            const newCode = [
              { uuid: Date.now(), code: text, details: res },
              ...parsedCodes,
            ];
            setCodes(newCode);
            LocalStorage.setItem("storedCodes", JSON.stringify(newCode));
          });
        }
      }
    }

    readClipboard();
  }, []);

  return (
    <List
      isShowingDetail
      isLoading={!codes}
      filtering={false}
      throttle={true}
      searchBarPlaceholder="Enter IFSC Code"
      onSearchTextChange={(newValue) => {
        if (!ifsc.validate(newValue)) {
          if (newValue.length == 11)
            showToast({
              style: Toast.Style.Failure,
              title: "Invalid IFSC Code",
              message: "Please enter a valid IFSC Code.",
            });
        } else if (!codes[0] || (codes[0] && codes[0].code != newValue)) {
          ifsc.fetchDetails(newValue).then(function (res: details) {
            const newCode: codes[] = [
              { uuid: Date.now(), code: newValue, details: res },
              ...codes,
            ];
            setCodes(newCode);
            LocalStorage.setItem("storedCodes", JSON.stringify(newCode));
          });
        }
      }}
    >
      {codes.map((code) => (
        <List.Item
          key={code.uuid}
          title={code.code}
          actions={
            <ActionPanel>
              <Action
                title="Copy Details to Clipboard"
                onAction={async () => {
                  await Clipboard.copy(JSON.stringify(code.details));
                  await showHUD("📋 Bank details copied to clipboard.");
                }}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="BRANCH"
                    text={code.details.BRANCH}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="ADDRESS"
                    text={code.details.ADDRESS}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="CITY"
                    text={code.details.CITY}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="DISTRICT"
                    text={code.details.DISTRICT}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="STATE"
                    text={code.details.STATE}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="CONTACT"
                    text={code.details.CONTACT}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="BANK CODE"
                    text={code.details.BANKCODE}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="MICR CODE"
                    text={code.details.MICR}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="UPI">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={code.details.UPI ? "Supported" : "Not Supported"}
                      color={code.details.UPI ? "#69f542" : "#fc2626"}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="IMPS, RTGS, NEFT">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={code.details.IMPS ? "Supported" : "Not Supported"}
                      color={code.details.IMPS ? "#69f542" : "#fc2626"}
                    />
                    <List.Item.Detail.Metadata.TagList.Item
                      text={code.details.RTGS ? "Supported" : "Not Supported"}
                      color={code.details.RTGS ? "#69f542" : "#fc2626"}
                    />
                    <List.Item.Detail.Metadata.TagList.Item
                      text={code.details.NEFT ? "Supported" : "Not Supported"}
                      color={code.details.NEFT ? "#69f542" : "#fc2626"}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
