import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getVirtualServerInformation } from "./api";
import { ErrorResponse, GetVirtualServerInformationResponse } from "./types";
import ErrorComponent from "./components/ErrorComponent";
import MetadataDetailComponent from "./components/MetadataDetailComponent";

export default function GetVirtualServerInformation() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorResponse>();
  const [information, setInformation] = useState<GetVirtualServerInformationResponse>();

  type Usage = {
    total: string;
    used: string;
    free: string;
    percentUsed: string;
  };
  const [hdd, setHDD] = useState<Usage>({
    total: "",
    used: "",
    free: "",
    percentUsed: "",
  });
  const [bw, setBW] = useState<Usage>({
    total: "",
    used: "",
    free: "",
    percentUsed: "",
  });
  const [mem, setMem] = useState<Usage>({
    total: "",
    used: "",
    free: "",
    percentUsed: "",
  });

  async function getFromApi() {
    setIsLoading(true);
    const response = await getVirtualServerInformation();
    if (response.status === "success") {
      setInformation(response);

      // hdd, bw, mem are comma separated so we store as object
      setHDD({
        total: response.hdd.split(",")[0],
        used: response.hdd.split(",")[1],
        free: response.hdd.split(",")[2],
        percentUsed: response.hdd.split(",")[3],
      });
      setBW({
        total: response.bw.split(",")[0],
        used: response.bw.split(",")[1],
        free: response.bw.split(",")[2],
        percentUsed: response.bw.split(",")[3],
      });
      setMem({
        total: response.mem.split(",")[0],
        used: response.mem.split(",")[1],
        free: response.mem.split(",")[2],
        percentUsed: response.mem.split(",")[3],
      });

      await showToast(Toast.Style.Success, "SUCCESS", "Fetched Information");
    } else setError(response);
    setIsLoading(false);
  }
  useEffect(() => {
    getFromApi();
  }, []);

  function generateUsageMetadataLabels(usage: Usage) {
    return (
      <>
        <Detail.Metadata.Label title="Total (Bytes)" text={usage.total} />
        <Detail.Metadata.Label title="Used (Bytes)" text={usage.used} />
        <Detail.Metadata.Label title="Free (Bytes)" text={usage.free} />
        <Detail.Metadata.Label title="Percent Used" text={usage.percentUsed + "%"} />
      </>
    );
  }
  function generateUsageSubmenuActions(usage: Usage, title: string) {
    return (
      <ActionPanel.Submenu title={`Copy ${title} Usage`} icon={Icon.ArrowRight}>
        <Action.CopyToClipboard title={`Copy ${title} Total Usage to Clipboard`} content={usage.total} />
        <Action.CopyToClipboard title={`Copy ${title} Used to Clipboard`} content={usage.used} />
        <Action.CopyToClipboard title={`Copy ${title} Available Usage to Clipboard`} content={usage.free} />
        <Action.CopyToClipboard title={`Copy ${title} Percent Used to Clipboard`} content={usage.percentUsed} />
      </ActionPanel.Submenu>
    );
  }

  const markdown = !information
    ? ""
    : `**IP Addresses**: ${information.ipaddr}
    
**Hard Disk Drive Usage**: ${hdd.used}/${hdd.total} Bytes (${hdd.percentUsed}%)
    
**Bandwidth Usage**: ${bw.used}/${bw.total} Bytes (${bw.percentUsed}%)
    
**Memory Usage**: ${mem.used}/${mem.total} Bytes (${mem.percentUsed}%)`;

  return error ? (
    <ErrorComponent error={error.statusmsg} />
  ) : (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        !information ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="IP Addresses" text={information.ipaddr} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Hard Disk Drive Usage" text="---" />
            {generateUsageMetadataLabels(hdd)}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Bandwidth Usage" text="---" />
            {generateUsageMetadataLabels(bw)}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Memory Usage" text="---" />
            {generateUsageMetadataLabels(mem)}
            <MetadataDetailComponent metadata={information} />
          </Detail.Metadata>
        )
      }
      actions={
        information && (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy IP Addresses to Clipboard" content={information.ipaddr} />
            {generateUsageSubmenuActions(hdd, "HDD")}
            {generateUsageSubmenuActions(bw, "Bandwidth")}
            {generateUsageSubmenuActions(mem, "Memory")}
          </ActionPanel>
        )
      }
    />
  );
}
