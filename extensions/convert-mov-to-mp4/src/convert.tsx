import { useState, useEffect } from "react";
import { Detail } from "@raycast/api";
import { LocalStorage } from "@raycast/api";
import { isFFmpegInstalled } from "./utils/ffmpeg";
import { HelloPage } from "./components/HelloPage";
import { NotInstalled } from "./components/NotInstalled";
import { ConverterForm } from "./components/ConverterForm";

export default function Command() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [hasSeenHelloPage, setHasSeenHelloPage] = useState<boolean | null>(null);

  useEffect(() => {
    async function init() {
      const installed = await isFFmpegInstalled();
      const seen = await LocalStorage.getItem("hasSeenHelloPage");
      setIsInstalled(installed);
      setHasSeenHelloPage(seen === "true");
    }
    init();
  }, []);

  if (hasSeenHelloPage === null || isInstalled === null) {
    return <Detail markdown="Loading..." />;
  }

  if (!hasSeenHelloPage) {
    return <HelloPage onContinue={() => setHasSeenHelloPage(true)} />;
  }

  if (!isInstalled) {
    return <NotInstalled onRefresh={() => setIsInstalled(true)} />;
  }

  return <ConverterForm />;
}