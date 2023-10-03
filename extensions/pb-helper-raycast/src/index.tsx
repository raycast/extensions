import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";

interface Option {
  title: string;
  url: string;
  icon: Icon
}

export default function Command() {
  const defaultOptions = [
    { title: "查單", url: "https://printingbanana.com/pb-admin/index.php?route=sale/order&filter_order_id=", icon: Icon.AppWindowList },
    { title: "會員", url: "https://printingbanana.com/pb-admin/index.php?route=sale/order&filter_customer=", icon: Icon.Person },
    { title: "順豐", url: "https://www.sf-express.com/we/ow/chn/sc/waybill/waybill-detail/", icon: Icon.Airplane },
  ]
  const [searchText, setSearchText] = useState("");
  const [options, setOptions] = useState<Option[]>(defaultOptions);

  return (
    <List
      filtering={false}
      onSearchTextChange={(text) => {
        setSearchText(text)

        const invoiceNo = parseInvoiceNo(text)
        if (invoiceNo) {
          const option = defaultOptions[0]
          option.title = `${option.title} ${invoiceNo}`
          option.url = option.url + invoiceNo
          setOptions([option])
        } else {
          const customerOption = defaultOptions[1]
          customerOption.title = `${customerOption.title} ${text}`
          customerOption.url = customerOption.url + encodeURIComponent(text)

          const sfOption = defaultOptions[2]
          sfOption.title = `${sfOption.title} ${text}`
          sfOption.url = sfOption.url + encodeURIComponent(text)
          if (isSFTracking(text)) {
            setOptions([sfOption, customerOption])
          } else {
            setOptions([customerOption, sfOption])
          }
        }
      }}
    >
      {options.map((option, index) => (
        <List.Item
          key={index}
          icon={option.icon}
          title={option.title}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={option.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function parseInvoiceNo(text: string) {
  if (isSFTracking(text)) {
    return ''
  }
  const regexPattern = /(QTN|INV|RCT)?(18|19|20|21|22|23|24|25)?([0-9]{1,5})/i;
  const match = text.match(regexPattern);
  match && console.log(match[0])

  if (match) {
    return match[0]
  } else {
    return '';
  }
}

function isSFTracking(text: string) {
  // SF1517981170280
  const regexPattern = /(SF)?([0-9]{12,13})/i;
  const match = text.match(regexPattern);

  if (match) {
    return match[0]
  } else {
    return '';
  }
}