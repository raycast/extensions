import { showHUD } from "@raycast/api";
import fetch from "node-fetch";

export default async function main() {
    fetch("http://192.168.1.15/DA", {
        "headers": {
          "accept": "text/plain, */*; q=0.01",
          "accept-language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
          "authorization": "Basic b3BlcmF0b3I6b3BlcmF0b3I=",
          "cache-control": "no-cache",
          "content-type": "text/xml; charset=UTF-8",
          "pragma": "no-cache",
          "soapaction": "http://opcfoundation.org/webservices/XMLDA/1.0/Write",
          "x-requested-with": "XMLHttpRequest"
        },
        "referrer": "http://192.168.1.15/lweb802/?project=room_301.lweb2",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": "<?xml version=\"1.0\" encoding=\"utf-8\"?><soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"><soap:Body><Write xmlns=\"http://opcfoundation.org/webservices/XMLDA/1.0/\" ReturnValuesOnReply=\"true\"><Options ReturnErrorText=\"true\" ReturnItemTime=\"true\" ClientRequestHandle=\"Write-4\"/><ItemList><Items ItemPath=\"CEA709 Port.Datapoints.R101.DALI\" ItemName=\"nvoLcManOverr5.state\" ClientItemHandle=\"gen0x00c0029a-4\"><Value xsi:type=\"xsd:int\">1</Value></Items></ItemList></Write></soap:Body></soap:Envelope>",
        "method": "POST",
      });

  await showHUD("Lights turned on");
}
